import { Link } from "react-router-dom";
import { COMPANY, COMPANY_ADDRESS_LINE, SERVICES } from "@obragoito/core";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <p className="site-footer__word">Obragoito</p>
            <p style={{ fontSize: "var(--text-sm)" }}>
              Construção, remodelação e obras públicas em Portugal desde {COMPANY.foundedYear}. Rigor técnico,
              compromisso e proximidade em cada obra.
            </p>
            <p className="mono-label" style={{ color: "rgba(251,250,247,.42)" }}>
              {COMPANY.legalName}
            </p>
          </div>

          <div>
            <p className="site-footer__col-title">Navegação</p>
            <ul className="site-footer__list">
              <li>
                <Link to="/servicos">Serviços</Link>
              </li>
              <li>
                <Link to="/projetos">Projetos</Link>
              </li>
              <li>
                <Link to="/sobre">Sobre a Obragoito</Link>
              </li>
              <li>
                <Link to="/contactos">Pedir orçamento</Link>
              </li>
              <li>
                <Link to="/privacidade">Privacidade e cookies</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="site-footer__col-title">Áreas de negócio</p>
            <ul className="site-footer__list">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link to={`/servicos#service-${service.slug}`}>{service.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="site-footer__col-title">Contactos</p>
            <ul className="site-footer__list">
              <li>
                <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a>
              </li>
              <li>
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </li>
              <li style={{ color: "rgba(251,250,247,.5)" }}>{COMPANY_ADDRESS_LINE}</li>
              <li style={{ display: "flex", gap: 16, paddingTop: 6 }}>
                <a href={COMPANY.social.facebook} target="_blank" rel="noreferrer noopener">
                  Facebook
                </a>
                <a href={COMPANY.social.instagram} target="_blank" rel="noreferrer noopener">
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="site-footer__col-title">Áreas de atuação</p>
            <ul className="site-footer__list">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link to={`/servicos#${service.slug}`}>{service.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="site-footer__legal">
          <span>
            © {year} {COMPANY.legalName}
          </span>
          <span>{COMPANY_ADDRESS_LINE}</span>
          <Link to="/privacidade">Privacidade</Link>
        </div>
      </div>
    </footer>
  );
}
