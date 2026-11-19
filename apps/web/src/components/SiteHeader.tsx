import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "@obragoito/ui";
import { COMPANY } from "@obragoito/core";

const LINKS = [
  { to: "/servicos", label: "Serviços" },
  { to: "/projetos", label: "Projetos" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contactos", label: "Contactos" },
];

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerClass = `site-header ${solid || !isHome || open ? "site-header--solid" : ""}`.trim();

  return (
    <>
      <header className={headerClass}>
        <div className="container site-header__inner">
          <Link to="/" className="site-header__brand" aria-label="Obragoito — página inicial">
            <Logo variant={solid || !isHome || open ? "dark" : "light"} />
          </Link>

          <nav className="site-nav" aria-label="Navegação principal">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link to="/contactos" className="btn btn--sm">
              <span>Pedir orçamento</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <button
            type="button"
            className="site-header__burger"
            aria-expanded={open}
            aria-controls="menu-movel"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="site-header__burger-lines" aria-hidden="true">
              <span />
              <span />
            </span>
            {open ? "Fechar" : "Menu"}
          </button>
        </div>
      </header>

      {open ? (
        <div className="mobile-menu" id="menu-movel">
          <nav aria-label="Navegação móvel">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-menu__foot">
            <Link to="/contactos" className="btn btn--accent" onClick={() => setOpen(false)}>
              <span>Pedir orçamento</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </div>
        </div>
      ) : null}
    </>
  );
}
