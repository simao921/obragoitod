import { Link } from "react-router-dom";
import { Reveal } from "@obragoito/ui";
import { COMPANY, COMPANY_FACTS } from "@obragoito/core";
import { Seo } from "../components/Seo";

const VALUES = [
  {
    title: "Missão",
    text: "Proporcionar soluções de construção de alta qualidade, que correspondam às necessidades e expectativas dos clientes, da conceção à conclusão da obra.",
  },
  {
    title: "Visão",
    text: "Ser reconhecida como referência no setor da construção civil, tanto pela qualidade dos projetos e obras como pela excelência no atendimento.",
  },
  {
    title: "Cultura",
    text: "O cliente em primeiro plano. Uma equipa qualificada e comprometida, que procura superar expectativas mantendo um padrão de qualidade elevado.",
  },
];

export function Sobre() {
  return (
    <>
      <Seo
        path="/sobre"
        title="Sobre a Obragoito — construção civil desde 1991"
        description="A Obragoito é uma empresa portuguesa de construção civil e obras públicas criada em 1991, com experiência em infraestruturas, urbanismo, reabilitação e empreendimentos."
      />

      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Sobre nós</p>
          <h1 className="page-hero__title">Mais de três décadas a construir o futuro com compromisso.</h1>
          <p className="page-hero__lede">
            Criada em 1991, a Obragoito tornou-se uma empresa de referência no setor da construção civil,
            especializada em soluções de alta qualidade e excelência.
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          <div className="about-split">
            <Reveal>
              <div className="about-image">
                <img
                  src="/media/projects/rotunda-benfica.jpg"
                  alt="Rotunda de Benfica, em Lisboa, obra de infraestrutura executada pela Obragoito"
                  loading="lazy"
                />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="stack-lg">
                <p className="eyebrow">Quem somos</p>
                <h2 style={{ fontSize: "var(--text-2xl)" }}>Experiência de mais de 35 anos no mercado nacional.</h2>
                <p className="text-muted">
                  Ao longo dos anos, a Obragoito executou com sucesso uma variedade de projetos, desde pequenas
                  intervenções até grandes empreendimentos. O compromisso com a qualidade e a competência
                  técnica tornaram a empresa uma referência reconhecida pela entrega de projetos bem-sucedidos.
                </p>
                <p className="text-muted">
                  Nos últimos anos, a empresa tem apostado cada vez mais na sustentabilidade e na utilização de
                  materiais e técnicas construtivas inovadoras, com o objetivo de minimizar o impacto ambiental.
                </p>
                <div className="facts" style={{ marginTop: 0 }}>
                  {COMPANY_FACTS.map((fact) => (
                    <div key={fact.label}>
                      <p className="fact__value">{fact.value}</p>
                      <p className="fact__label">{fact.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section--tight" style={{ borderTop: "1px solid var(--slate)" }}>
        <div className="container">
          <div className="section__head">
            <p className="eyebrow">Princípios</p>
            <h2 className="section__title">O que orienta cada obra que assumimos.</h2>
          </div>
          <div className="values">
            {VALUES.map((value, index) => (
              <Reveal key={value.title} as="div" className="value" delay={index * 70}>
                <h3 className="value__title">{value.title}</h3>
                <p className="value__text">{value.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" style={{ borderTop: "1px solid var(--slate)" }}>
        <div className="container" style={{ display: "grid", gap: "var(--space-5)", maxWidth: 760 }}>
          <p className="eyebrow">Empresa</p>
          <h2 className="section__title">{COMPANY.legalName}</h2>
          <p className="text-muted">
            Sede em {COMPANY.address.street}, {COMPANY.address.postalCode} {COMPANY.address.city}. Pode
            contactar-nos por telefone ({COMPANY.phone}) ou por email ({COMPANY.email}).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link to="/contactos" className="btn btn--solid">
              <span>Contactar</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link to="/projetos" className="btn">
              <span>Ver projetos</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
