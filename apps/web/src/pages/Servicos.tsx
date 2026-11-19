import { Link } from "react-router-dom";
import { Reveal } from "@obragoito/ui";
import { SERVICES } from "@obragoito/core";
import { Seo } from "../components/Seo";

export function Servicos() {
  return (
    <>
      <Seo
        title="Serviços — Obragoito"
        description="Obras públicas, infraestruturas, urbanismo, reabilitação e empreendimentos. As áreas de atuação da Obragoito na construção civil."
      />

      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Serviços</p>
          <h1 className="page-hero__title">Construção civil e obras públicas, do projeto à entrega.</h1>
          <p className="page-hero__lede">
            Atuamos em várias áreas do ramo da construção civil e das obras públicas. Cada intervenção é
            planeada com o mesmo critério: compreender o lugar, escolher os materiais certos e executar com
            rigor.
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          {SERVICES.map((service, index) => (
            <Reveal as="article" key={service.slug} className="about-split" delay={index * 60}>
              <div className="about-image" id={service.slug} style={{ scrollMarginTop: "120px" }}>
                <img src={service.image} alt={service.imageAlt} loading="lazy" decoding="async" />
              </div>
              <div>
                <p className="mono-label">{String(index + 1).padStart(2, "0")} · {service.material}</p>
                <h2 style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-3)" }}>{service.title}</h2>
                <p className="lede" style={{ marginTop: "var(--space-4)" }}>
                  {service.description}
                </p>
                <p style={{ marginTop: "var(--space-4)", color: "var(--ink-muted)", fontSize: "var(--text-sm)" }}>
                  {service.short}
                </p>
                <div style={{ marginTop: "var(--space-5)" }}>
                  <Link to="/contactos" className="btn btn--sm">
                    <span>Falar sobre este serviço</span>
                    <span className="btn__arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section section--tight" style={{ borderTop: "1px solid var(--slate)" }}>
        <div className="container" style={{ display: "grid", gap: "var(--space-5)", maxWidth: 780 }}>
          <p className="eyebrow">Nota</p>
          <h2 className="section__title">Serviços descritos a partir das áreas de atuação publicadas pela empresa.</h2>
          <p className="text-muted">
            A Obragoito avalia cada pedido de forma individual. O âmbito, os materiais e os prazos de cada
            obra são definidos em orçamento, depois de uma visita ao local.
          </p>
          <div>
            <Link to="/contactos" className="btn btn--solid">
              <span>Pedir orçamento</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
