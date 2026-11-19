import { useEffect, useState, type ReactNode } from "react";
import { api, COMPANY, type SiteState } from "@obragoito/core";
import { Logo } from "./logo";

const DEFAULT_MESSAGE =
  "O site está temporariamente em manutenção. Voltamos em breve com todas as obras e novidades.";

export function useSiteState() {
  const [state, setState] = useState<SiteState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<SiteState>("/public/site-state")
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active) setState({ maintenance: { enabled: false, message: null } });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { state, loading };
}

export function MaintenanceScreen({ message, portal }: { message: string | null; portal?: string }) {
  return (
    <div className="maintenance grain">
      <div className="maintenance__inner">
        <Logo />
        <p className="eyebrow" style={{ marginTop: "var(--space-6)" }}>
          {portal ?? "Obragoito"}
        </p>
        <h1 className="maintenance__title">Estamos a preparar tudo.</h1>
        <p className="maintenance__text">{message?.trim() ? message : DEFAULT_MESSAGE}</p>

        <div className="maintenance__contact">
          <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
      </div>
    </div>
  );
}

/**
 * Mostra a página de manutenção a qualquer visitante do site público,
 * do portal de clientes e do portal da equipa. A gestão e o portal dev
 * não usam este componente e continuam sempre acessíveis.
 */
export function MaintenanceGate({ children, portal }: { children: ReactNode; portal?: string }) {
  const { state, loading } = useSiteState();

  if (!loading && state?.maintenance?.enabled) {
    return <MaintenanceScreen message={state.maintenance.message} portal={portal} />;
  }

  return <>{children}</>;
}
