import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "solid" | "accent" | "outline" | "outline-light" | "quiet" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  arrow?: boolean;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  solid: "btn--solid",
  accent: "btn--accent",
  outline: "",
  "outline-light": "btn--outline-light",
  quiet: "btn--quiet",
  danger: "btn--danger",
};

export function Button({ variant = "outline", size = "md", block, arrow, className = "", children, ...rest }: ButtonProps) {
  const classes = ["btn", variantClass[variant], size === "sm" ? "btn--sm" : "", block ? "btn--block" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} {...rest}>
      <span>{children}</span>
      {arrow ? (
        <span className="btn__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const role = tone === "error" ? "alert" : "status";
  return (
    <div className={`alert alert--${tone}`} role={role}>
      <div>{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "dark" | "success" | "danger" }) {
  const toneClass = tone === "default" ? "" : `badge--${tone}`;
  return <span className={`badge ${toneClass}`.trim()}>{children}</span>;
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  );
}

export function LoadingBlock({ label = "A carregar…" }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
