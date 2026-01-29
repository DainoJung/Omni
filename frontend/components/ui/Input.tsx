"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

// === Text Input ===
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s/g, "_");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-11 px-4 border rounded-sm text-sm transition-colors
            ${
              error
                ? "border-error focus:border-error focus:ring-1 focus:ring-error"
                : "border-border focus:border-border-focus focus:ring-1 focus:ring-border-focus/10"
            }
            placeholder:text-text-tertiary
            disabled:bg-bg-secondary disabled:text-text-tertiary
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// === Textarea ===
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, maxLength, showCount, className = "", id, value, ...props },
    ref
  ) => {
    const inputId = id || label?.replace(/\s/g, "_");
    const currentLength =
      typeof value === "string" ? value.length : 0;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            value={value}
            maxLength={maxLength}
            className={`w-full min-h-[120px] px-4 py-3 border rounded-sm text-sm transition-colors resize-y
              ${
                error
                  ? "border-error focus:border-error"
                  : "border-border focus:border-border-focus focus:ring-1 focus:ring-border-focus/10"
              }
              placeholder:text-text-tertiary
              disabled:bg-bg-secondary disabled:text-text-tertiary
              ${className}`}
            {...props}
          />
          {showCount && maxLength && (
            <span className="absolute bottom-3 right-3 text-xs text-text-tertiary">
              {currentLength}/{maxLength}자
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
