import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-4 py-2 text-sm",
        "placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:border-[var(--color-ring)] focus-visible:ring-4 focus-visible:ring-[var(--color-ring)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-[var(--color-input)] bg-white px-4 py-2.5 text-sm",
        "placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:border-[var(--color-ring)] focus-visible:ring-4 focus-visible:ring-[var(--color-ring)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-4 py-2 text-sm",
        "focus-visible:outline-none focus-visible:border-[var(--color-ring)] focus-visible:ring-4 focus-visible:ring-[var(--color-ring)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem] pr-10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Input, Textarea, Select };