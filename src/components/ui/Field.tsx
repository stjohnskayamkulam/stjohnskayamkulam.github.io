import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/utils/cn";

const controlClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function Wrapper({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={fieldId}>
      <input id={fieldId} className={cn(controlClass, className)} {...rest} />
    </Wrapper>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: TextAreaFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={fieldId}>
      <textarea
        id={fieldId}
        rows={4}
        className={cn(controlClass, className)}
        {...rest}
      />
    </Wrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...rest
}: SelectFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={fieldId}>
      <select
        id={fieldId}
        className={cn(controlClass, "pr-8", className)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  );
}
