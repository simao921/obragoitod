import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Logo } from "./logo";

export type PortalNavItem = {
  to: string;
  label: string;
  end?: boolean;
  count?: number;
};

type PortalShellProps = {
  brandSub: string;
  nav: PortalNavItem[];
  title: string;
  user: { fullName: string; roleLabel: string };
  onLogout: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function PortalShell({ brandSub, nav, title, user, onLogout, actions, children }: PortalShellProps) {
  return (
    <div className="portal">
      <aside className="portal__sidebar">
        <div className="portal__brand">
          <Logo variant="light" size="sm" />
          <span className="portal__brand-sub">{brandSub}</span>
        </div>

        <nav className="portal__nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 ? (
                <span className="portal__nav-count">{item.count}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="portal__user">
          <p style={{ fontWeight: 500 }}>{user.fullName}</p>
          <p className="portal__user-role">{user.roleLabel}</p>
          <button type="button" className="btn btn--quiet btn--sm" style={{ marginTop: 12, color: "inherit" }} onClick={onLogout}>
            Terminar sessão
          </button>
        </div>
      </aside>

      <div className="portal__main">
        <header className="portal__topbar">
          <span className="portal__topbar-title">{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {actions}
            <span className="mono-label" style={{ display: "none" }}>
              {user.fullName}
            </span>
            <button type="button" className="btn btn--quiet btn--sm" onClick={onLogout} aria-label="Terminar sessão">
              Sair
            </button>
          </div>
        </header>

        <nav className="portal__mobile-nav" aria-label="Navegação">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="btn btn--quiet btn--sm">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="portal__content" id="conteudo">
          {children}
        </main>
      </div>
    </div>
  );
}

type AuthLayoutProps = {
  brandSub: string;
  image: string;
  imageAlt: string;
  asideTitle: string;
  asideText: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({
  brandSub,
  image,
  imageAlt,
  asideTitle,
  asideText,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="auth">
      <aside className="auth__aside grain">
        <img src={image} alt={imageAlt} />
        <div className="auth__aside-inner">
          <Logo variant="light" />
          <div>
            <p className="eyebrow eyebrow--bare" style={{ color: "rgba(251,250,247,.6)" }}>
              {brandSub}
            </p>
            <h2 style={{ fontSize: "var(--text-3xl)", marginTop: "var(--space-4)", color: "var(--white-warm)" }}>
              {asideTitle}
            </h2>
            <p style={{ marginTop: "var(--space-4)", maxWidth: "34ch", color: "rgba(251,250,247,.7)", fontSize: "var(--text-sm)" }}>
              {asideText}
            </p>
          </div>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <Logo />
          <p className="eyebrow" style={{ marginTop: "var(--space-6)" }}>
            {brandSub}
          </p>
          <h1 className="auth__title">{title}</h1>
          <p className="auth__sub">{subtitle}</p>
          <div className="auth__form">{children}</div>
          {footer ? <div className="auth__foot">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
