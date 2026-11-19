import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
};

function FieldShell({ id, label, error, hint, optional, children }: FieldShellProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional ? <span aria-hidden="true"> · opcional</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
};

export function TextField({ label, error, hint, optional, id, ...rest }: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} optional={optional}>
      <input
        id={inputId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
};

export function TextAreaField({ label, error, hint, optional, id, ...rest }: TextAreaFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} optional={optional}>
      <textarea
        id={inputId}
        className="textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({ label, error, hint, optional, id, options, placeholder, ...rest }: SelectFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} optional={optional}>
      <select
        id={inputId}
        className="select"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  error?: string;
};

export function CheckboxField({ label, error, id, ...rest }: CheckboxFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="field">
      <label className="checkbox" htmlFor={inputId}>
        <input id={inputId} type="checkbox" aria-invalid={error ? true : undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
