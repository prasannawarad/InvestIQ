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
          border: "1px solid var(--investiq-accent)",
          fontFamily: "var(--investiq-font-sans), system-ui",
          boxShadow: "0 24px 64px rgba(26,36,56,0.14)",
          borderRadius: "14px",
        },
      }}
    />
  );
}
