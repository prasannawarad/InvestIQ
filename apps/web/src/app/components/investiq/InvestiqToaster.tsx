"use client";

import { Toaster } from "sonner";
import "sonner/dist/styles.css";

/** Sonner toasts tinted with InvestIQ CSS variables (`RootLayout`). */
export function InvestiqToaster() {
  return (
    <Toaster
      position="top-center"
      offset={96}
      closeButton
      toastOptions={{
        style: {
          background: "var(--investiq-card-bg)",
          color: "var(--investiq-text)",
          border: "1px solid color-mix(in srgb, var(--investiq-accent) 55%, transparent)",
          fontFamily: "var(--investiq-font-sans), system-ui",
          boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
          borderRadius: "14px",
        },
      }}
    />
  );
}
