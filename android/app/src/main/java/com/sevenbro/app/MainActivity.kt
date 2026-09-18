package com.sevenbro.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File

/**
 * Thin native shell around the live Seven Bro PWA.
 * Web content always loads from BuildConfig.APP_URL — APK updates are not required
 * for product changes. Only rebuild the APK for native shell behavior.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorView: View
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraOutputUri: Uri? = null
    private var chromeDark = false
    private var statusInsetPx = 0
    private var navInsetPx = 0

    /** Web → native: sinkron warna status/nav bar + ikon sistem ke theme app */
    inner class ShellBridge {
        @JavascriptInterface
        fun setChrome(dark: Boolean) {
            runOnUiThread { applyChromeColors(dark) }
        }
    }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback ?: return@registerForActivityResult
            filePathCallback = null
            val data = result.data
            val results: Array<Uri>? = when {
                result.resultCode != Activity.RESULT_OK -> null
                data?.data != null -> arrayOf(data.data!!)
                cameraOutputUri != null -> arrayOf(cameraOutputUri!!)
                else -> WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            }
            cameraOutputUri = null
            callback.onReceiveValue(results)
        }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = null
                cameraOutputUri = null
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        swipeRefresh = findViewById(R.id.swipe_refresh)
        progressBar = findViewById(R.id.progress)
        errorView = findViewById(R.id.error_view)
        errorText = findViewById(R.id.error_text)
        retryButton = findViewById(R.id.retry_button)

        applySystemBars()
        setupWebView()
        setupNavigation()
        setupSwipeRefresh()

        retryButton.setOnClickListener {
            errorView.visibility = View.GONE
            webView.reload()
        }

        if (savedInstanceState == null) {
            webView.clearHistory()
            webView.loadUrl(BuildConfig.APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun applySystemBars() {
        // Xiaomi/MIUI often ignore decorFitsSystemWindows. Force edge-to-edge and
        // pad the ROOT view (native px) so WebView lays out BETWEEN system bars.
        // Never inject Android px into WebView CSS — those units are not the same.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.requestApplyInsets(root)
        applyChromeColors(dark = false)
    }

    private fun applyChromeColors(dark: Boolean) {
        chromeDark = dark
        val chrome = if (dark) 0xFF151B23.toInt() else Color.WHITE
        val page = if (dark) 0xFF0B0F14.toInt() else 0xFFF3F7F4.toInt()
        findViewById<View>(R.id.root)?.setBackgroundColor(chrome)
        swipeRefresh.setBackgroundColor(page)
        webView.setBackgroundColor(page)
        @Suppress("DEPRECATION")
        window.statusBarColor = chrome
        @Suppress("DEPRECATION")
        window.navigationBarColor = chrome
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = !dark
            isAppearanceLightNavigationBars = !dark
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            // Match Chrome mobile: honor width=device-width, do NOT zoom out to "fit".
            loadWithOverviewMode = false
            useWideViewPort = true
            textZoom = 100
            layoutAlgorithm = WebSettings.LayoutAlgorithm.NORMAL
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = userAgentString
                ?.replace("; wv", "")
                ?.let { "$it SevenBroApp/${BuildConfig.VERSION_NAME}" }
                ?: userAgentString
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = true
            }
        }

        webView.addJavascriptInterface(ShellBridge(), "SevenBroShell")
        webView.setBackgroundColor(ContextCompat.getColor(this, R.color.page))
        webView.webViewClient = createWebViewClient()
        webView.webChromeClient = createWebChromeClient()
    }

    private fun createWebViewClient(): WebViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            val uri = request?.url ?: return false
            val scheme = uri.scheme?.lowercase() ?: return false

            if (scheme == "http" || scheme == "https") {
                // Stay inside the shell so session cookies remain in this WebView.
                return false
            }

            return try {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
                true
            } catch (_: ActivityNotFoundException) {
                true
            }
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            progressBar.visibility = View.VISIBLE
            errorView.visibility = View.GONE
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            progressBar.visibility = View.GONE
            swipeRefresh.isRefreshing = false
            injectShellChrome()
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (request?.isForMainFrame != true) return
            progressBar.visibility = View.GONE
            swipeRefresh.isRefreshing = false
            errorText.text = getString(
                R.string.error_offline,
                error?.description?.toString() ?: "Network error"
            )
            errorView.visibility = View.VISIBLE
        }
    }

    private fun injectShellChrome() {
        // Native root padding already reserves system-bar space.
        // Zero out any web/header safe-area padding so nothing double-offsets.
        val script = """
            (function () {
              try {
                var root = document.documentElement;
                root.classList.add('sevenbro-shell');
                root.style.setProperty('--sevenbro-status-bar-inset', '0px');
                root.style.setProperty('--sevenbro-nav-bar-inset', '0px');
                var st = document.getElementById('sevenbro-shell-css');
                if (!st) {
                  st = document.createElement('style');
                  st.id = 'sevenbro-shell-css';
                  st.textContent = [
                    'html,body{overflow-x:hidden;max-width:100%;}',
                    'header.sevenbro-header,header.sticky.top-0{padding-top:0 !important;}',
                    'nav.sevenbro-nav,nav.sticky.bottom-0{padding-bottom:0 !important;}'
                  ].join('');
                  root.appendChild(st);
                }
                function report() {
                  var dark = root.classList.contains('dark');
                  try { if (window.SevenBroShell && SevenBroShell.setChrome) SevenBroShell.setChrome(dark); } catch (e) {}
                }
                report();
                if (!window.__sevenbroChromeObs) {
                  window.__sevenbroChromeObs = true;
                  try {
                    new MutationObserver(report).observe(root, { attributes: true, attributeFilter: ['class'] });
                  } catch (e) {}
                }
              } catch (e) {}
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun injectSafeAreaHelper(view: WebView?) {
        view?.let { injectShellChrome() }
    }

    private fun createWebChromeClient(): WebChromeClient = object : WebChromeClient() {
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            progressBar.progress = newProgress
            if (newProgress >= 100) {
                progressBar.visibility = View.GONE
            } else {
                progressBar.visibility = View.VISIBLE
            }
        }

        override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
        ): Boolean {
            this@MainActivity.filePathCallback?.onReceiveValue(null)
            this@MainActivity.filePathCallback = filePathCallback
            cameraOutputUri = null

            val missingCamera = ContextCompat.checkSelfPermission(
                this@MainActivity,
                Manifest.permission.CAMERA
            ) != PackageManager.PERMISSION_GRANTED

            if (missingCamera) {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                // Continue after permission dialog via chooser retry if needed.
                // Still open system chooser; camera may require a second tap after grant.
            }

            val chooserIntent = buildFileChooserIntent(fileChooserParams)
            return try {
                fileChooserLauncher.launch(chooserIntent)
                true
            } catch (_: ActivityNotFoundException) {
                this@MainActivity.filePathCallback = null
                false
            }
        }
    }

    private fun buildFileChooserIntent(params: WebChromeClient.FileChooserParams?): Intent {
        val intents = mutableListOf<Intent>()

        val contentIntent = params?.createIntent()
        if (contentIntent != null) {
            intents += contentIntent
        } else {
            intents += Intent(Intent.ACTION_GET_CONTENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "image/*"
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
            }
        }

        // Camera capture path for Mass Report photo inputs (capture=environment).
        val cameraIntent = createCameraIntent()
        if (cameraIntent != null) {
            intents += cameraIntent
        }

        return if (intents.size == 1) {
            intents.first()
        } else {
            Intent(Intent.ACTION_CHOOSER).apply {
                putExtra(Intent.EXTRA_INTENT, intents.first())
                putExtra(
                    Intent.EXTRA_INITIAL_INTENTS,
                    intents.drop(1).toTypedArray()
                )
            }
        }
    }

    private fun createCameraIntent(): Intent? {
        return try {
            val photosDir = File(cacheDir, "photos").apply { mkdirs() }
            val file = File(photosDir, "capture_${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(
                this,
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                file
            )
            cameraOutputUri = uri
            Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        } catch (_: Exception) {
            cameraOutputUri = null
            null
        }
    }

    private fun setupNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.lime),
            ContextCompat.getColor(this, R.color.forest)
        )
        swipeRefresh.setProgressBackgroundColorSchemeColor(
            ContextCompat.getColor(this, R.color.page)
        )
        swipeRefresh.setOnRefreshListener { webView.reload() }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
