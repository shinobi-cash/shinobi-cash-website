import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "./input";

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  errorText?: string;
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  autoComplete,
  className,
  errorText,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const toggleId = useId();

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pr-10 ${className ?? ""}`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-describedby={errorText ? `${toggleId}-error` : undefined}
        aria-invalid={!!errorText}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center"
        disabled={disabled}
      >
        {show ? <EyeOff className="h-4 w-4 text-app-tertiary" /> : <Eye className="h-4 w-4 text-app-tertiary" />}
      </button>
      {errorText && (
        <p id={`${toggleId}-error`} className="text-red-600 text-xs mt-1">
          {errorText}
        </p>
      )}
    </div>
  );
}
