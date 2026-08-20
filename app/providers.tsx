"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/lib/contexts/CartContext";
import { SWRConfig } from "swr";
import { swrConfig } from "@/hooks/useSWRConfig";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
    }
  }, []);

  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>
        <CartProvider>{children}</CartProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
