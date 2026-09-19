"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { loadPrefs, savePrefs, type Prefs } from "@/lib/prefs"
import { translate, type Lang, type StringKey } from "@/lib/locales"

type I18nCtx = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id")

  useEffect(() => {
    const prefs = loadPrefs()
    setLangState(prefs.lang)
    document.documentElement.lang = prefs.lang
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    document.documentElement.lang = next
    const prefs: Prefs = loadPrefs()
    savePrefs({ ...prefs, lang: next })
  }, [])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback aman di luar provider (SSR / test)
    return {
      lang: "id",
      setLang: () => {},
      t: (key, vars) => translate("id", key, vars),
    }
  }
  return ctx
}

/** Shortcut: const t = useT() */
export function useT() {
  return useI18n().t
}
