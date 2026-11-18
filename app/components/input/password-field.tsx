import { useState } from "react";

interface PasswordFieldProps {
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function PasswordField({
  autoComplete,
  disabled = false,
  value,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <input
        autoComplete={autoComplete}
        disabled={disabled}
        id="password"
        minLength={autoComplete === "new-password" ? 6 : undefined}
        name="password"
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Slaptažodis"
        required
        type={isVisible ? "text" : "password"}
        value={value}
      />
      <button
        className="auth-card__text-button auth-password-toggle"
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
        type="button"
      >
        {isVisible ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
      </button>
    </>
  );
}
