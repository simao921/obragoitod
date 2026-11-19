import { COMPANY, COMPANY_ADDRESS_LINE } from "@obragoito/core";
import { Seo } from "../components/Seo";
import { QuoteForm } from "../components/QuoteForm";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${COMPANY.address.street}, ${COMPANY.address.postalCode} ${COMPANY.address.city}`,
)}`;

export function Contactos() {
  return (
    <>
      <Seo
        title="Contactos e pedidos de orçamento — Obragoito"
        description="Contacte a Obragoito: telefone, email e formulário de pedido de orçamento para obras, remodelações e obras públicas."
      />

      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Contactos</p>
          <h1 className="page-hero__title">Fale connosco sobre a sua obra.</h1>
          <p className="page-hero__lede">
            Descreva o que pretende construir ou transformar. Reunimos a informação necessária e
            respondemos com os próximos passos.
          </p>
        </div>
      </header>

      <div className="container">
        <div className="contact-grid">
          <section aria-labelledby="pedido-orcamento">
            <h2 id="pedido-orcamento" className="panel__title" style={{ marginBottom: "var(--space-5)" }}>
              Pedido de orçamento
            </h2>
            <QuoteForm />
          </section>

          <aside className="contact-aside" aria-label="Contactos da empresa">
            <div className="contact-block">
              <p className="contact-block__label">Sede</p>
              <p className="contact-block__value">
                {COMPANY.address.street}
                <br />
                {COMPANY.address.postalCode} {COMPANY.address.city}
              </p>
              <p style={{ marginTop: "var(--space-3)" }}>
                <a href={MAPS_URL} target="_blank" rel="noreferrer noopener" className="link-underline">
                  Abrir no Google Maps
                </a>
              </p>
            </div>

            <div className="contact-block">
              <p className="contact-block__label">Telefone</p>
              <p className="contact-block__value">
                <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a>
              </p>
            </div>

            <div className="contact-block">
              <p className="contact-block__label">Email</p>
              <p className="contact-block__value">
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </p>
            </div>

            <div className="contact-block">
              <p className="contact-block__label">Redes sociais</p>
              <div className="contact-social">
                <a href={COMPANY.social.facebook} target="_blank" rel="noreferrer noopener">
                  Facebook
                </a>
                <a href={COMPANY.social.instagram} target="_blank" rel="noreferrer noopener">
                  Instagram
                </a>
              </div>
            </div>

            <div className="contact-block">
              <p className="contact-block__label">Empresa</p>
              <p style={{ fontSize: "var(--text-sm)" }}>{COMPANY.legalName}</p>
              <p className="mono-label" style={{ marginTop: 6, textTransform: "none", letterSpacing: "0.02em" }}>
                {COMPANY_ADDRESS_LINE}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
