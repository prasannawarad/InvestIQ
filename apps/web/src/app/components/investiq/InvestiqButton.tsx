"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { investiqButtonStyle, type InvestiqButtonVariant } from "../../../lib/investiqUi";

interface InvestiqButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: InvestiqButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: ReactNode;
}

export function InvestiqButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  disabled,
  children,
  style,
  type = "button",
  ...rest
}: InvestiqButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`select-none hover:brightness-110 active:scale-[0.98] active:brightness-[0.96] disabled:pointer-events-none disabled:opacity-40 ${className}`}
      style={{
        ...investiqButtonStyle(variant, { size, fullWidth }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
