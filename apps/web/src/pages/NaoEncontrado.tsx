import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function NaoEncontrado() {
  return (
    <>
      <Seo title="Página não encontrada — Obragoito" description="A página que procura não existe." noIndex />
      <div className="container page-top" style={{ paddingBottom: "var(--space-9)", minHeight: "60svh" }}>
        <p className="eyebrow">Erro 404</p>
        <h1 className="page-hero__title" style={{ marginTop: "var(--space-4)" }}>
          Esta página não existe.
        </h1>
        <p className="lede" style={{ marginTop: "var(--space-4)" }}>
          O endereço pode estar incorrecto ou a página foi movida. Continue a partir da página inicial.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "var(--space-6)" }}>
          <Link to="/" className="btn btn--solid">
            <span>Página inicial</span>
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link to="/projetos" className="btn">
            <span>Ver projetos</span>
          </Link>
          <Link to="/contactos" className="btn">
            <span>Contactos</span>
          </Link>
        </div>
      </div>
    </>
  );
}
