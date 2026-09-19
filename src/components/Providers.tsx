"use client"

import { SWRConfig } from "swr"
import { swrLocalStorageProvider } from "@/lib/swr-store"
import { I18nProvider } from "@/lib/i18n"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <SWRConfig
        value={{
          provider: swrLocalStorageProvider,
          revalidateOnFocus: true,
          revalidateIfStale: true,
          dedupingInterval: 5000,
        }}
      >
        {children}
      </SWRConfig>
    </I18nProvider>
  )
}
