"use client"

import { SWRConfig } from "swr"
import { swrLocalStorageProvider } from "@/lib/swr-store"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
