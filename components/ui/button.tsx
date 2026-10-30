"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  pendingLabel?: ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({
  children,
  busy = false,
  className,
  disabled,
  pendingLabel = "Working…",
  variant = "primary",
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus();
  const isBusy = busy || pending;
  const isDisabled = disabled || isBusy;

  return (
    <button
      aria-busy={isBusy || undefined}
      data-state={isBusy ? "pending" : isDisabled ? "disabled" : "ready"}
      className={cn(
        "button",
        variant === "primary" ? "button-primary" : "button-secondary",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isBusy ? <span aria-hidden="true" className="button-spinner" /> : null}
      <span className="button-label">{isBusy ? pendingLabel : children}</span>
    </button>
  );
}
