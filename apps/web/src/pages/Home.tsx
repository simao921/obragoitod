import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, useParallax } from "@obragoito/ui";
import { COMPANY_FACTS, SERVICES } from "@obragoito/core";
import { Seo } from "../components/Seo";
import { ProjectCard } from "../components/ProjectCard";
import { fetchProjects } from "../lib/projects";
import type { ProjectSummary } from "@obragoito/core";

const PROCESS = [
  {
    title: "Levantamento",
    text: "Visita ao local e leitura do que já existe, com atenção ao uso real do espaço e às condicionantes da obra.",
  },
  {
    title: "Projeto e orçamento",
    text: "Definição de soluções, materiais e prazos, traduzida num orçamento claro e detalhado.",
  },
  {
    title: "Execução",
    text: "Equipa qualificada e coordenação de especialidades, com controlo de qualidade em obra.",
  },
  {
    title: "Entrega",
    text: "Verificação final, documentação da intervenção e acompanhamento depois da conclusão.",
  },
];

export function Home() {
  const parallaxRef = useParallax<HTMLImageElement>(0.08);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = projects.slice(0, 3);

  return (
    <>
      <Seo
        path="/"
        title="Obragoito — Construção civil e obras públicas em Lisboa"
        description="Construímos o que permanece. Obras públicas, infraestruturas, urbanismo, reabilitação e empreendimentos em Portugal, desde 1991."
      />

      <section className="hero">
        <div className="hero__media" aria-hidden="true">
          <img ref={parallaxRef} src="/media/projects/saldanha.jpg" alt="" decoding="async" />
        </div>
        <div className="hero__veil" aria-hidden="true" />

        <div className="container hero__inner">
          <Reveal>
            <p className="hero__eyebrow">Construção civil · Remodelação · Obras públicas</p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="hero__title">
              <span>Construímos</span>
              <span>
                o que <em>permanece</em>.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <div className="hero__row">
              <p className="hero__lede">
                Empresa portuguesa de construção civil e obras públicas desde 1991. Intervimos no espaço
                público, nas infraestruturas e no edificado, com rigor técnico e acompanhamento próximo.
              </p>
              <div className="hero__actions">
                <Link to="/contactos" className="btn btn--accent">
                  <span>Pedir orçamento</span>
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link to="/projetos" className="btn btn--outline-light">
                  <span>Ver projetos</span>
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="hero__meta">
            <span>Desde 1991</span>
            <span>250+ obras realizadas</span>
            <span>São João das Lampas · Lisboa</span>
          </div>
        </div>

        <span className="hero__rail" aria-hidden="true">
          Obragoito · Construções e Obras Públicas
        </span>
      </section>

      <section className="section" aria-labelledby="quem-somos">
        <div className="container">
          <div className="statement">
            <Reveal>
              <div>
                <p className="eyebrow" id="quem-somos">
                  Quem somos
                </p>
                <h2 className="statement__text" style={{ marginTop: "var(--space-5)" }}>
                  Três décadas a construir com <em>compromisso</em>, rigor e ofício.
                </h2>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="statement__body">
                <p>
                  Criada em 1991, a Obragoito construiu o seu percurso na construção civil e nas obras
                  públicas, com intervenções que vão de pequenas intervenções a grandes empreendimentos.
                </p>
                <p>
                  O compromisso com a qualidade e a competência técnica tornou a empresa uma referência
                  no setor, reconhecida pela condução de obras exigentes e pela proximidade ao cliente.
                </p>
                <p>
                  Nos últimos anos a aposta tem sido também a sustentabilidade e a adoção de materiais e
                  técnicas construtivas que reduzem o impacto ambiental.
                </p>
                <Link to="/sobre" className="link-underline" style={{ fontSize: "var(--text-sm)" }}>
                  Conhecer a empresa
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="facts">
            {COMPANY_FACTS.map((fact, index) => (
              <Reveal key={fact.label} delay={index * 90}>
                <div>
                  <p className="fact__value">{fact.value}</p>
                  <p className="fact__label">{fact.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="areas">
        <div className="container">
          <div className="section__head">
            <p className="eyebrow" id="areas">
              Áreas de atuação
            </p>
            <div>
              <h2 className="section__title section__title--wide">
                Atuamos em várias áreas da construção civil e das obras públicas.
              </h2>
            </div>
          </div>

          <div className="services">
            {SERVICES.map((service, index) => (
              <Reveal key={service.slug} delay={index * 60}>
                <Link to={`/servicos#${service.slug}`} className="service">
                  <span className="service__index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="service__main">
                    <h3 className="service__title">{service.title}</h3>
                    <p className="service__desc">{service.description}</p>
                    <p className="service__meta">
                      <span>{service.material}</span>
                      <span className="service__link">
                        <span>Ver área</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </p>
                  </div>
                  <span className="service__thumb" aria-hidden="true">
                    <img src={service.image} alt="" loading="lazy" decoding="async" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="portfolio">
        <div className="container">
          <div className="section__head">
            <p className="eyebrow" id="portfolio">
              Portefólio
            </p>
            <div>
              <h2 className="section__title">Conheça alguns dos nossos projetos.</h2>
              <p className="section__lead" style={{ marginTop: "var(--space-4)" }}>
                Uma seleção de obras desenvolvidas nas diferentes áreas de atuação da Obragoito.
              </p>
            </div>
          </div>

          {state === "loading" ? (
            <div className="loading-block" role="status">
              <span className="spinner" aria-hidden="true" />
              <span>A carregar projetos…</span>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="notice-bar" role="status">
              <span>Não foi possível carregar os projetos neste momento.</span>
              <Link to="/projetos" className="link-underline">
                Tentar na página de projetos
              </Link>
            </div>
          ) : null}

          {state === "ready" && featured.length === 0 ? (
            <div className="empty">
              <p className="empty__title">Portefólio em atualização</p>
              <p className="empty__text">
                Estamos a publicar as obras realizadas. Entretanto, fale connosco para conhecer trabalhos
                realizados na sua área.
              </p>
              <Link to="/contactos" className="btn btn--sm">
                <span>Falar com a equipa</span>
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          ) : null}

          {featured.length > 0 ? (
            <div className="projects-grid projects-grid--masonry">
              {featured.map((project, index) => (
                <ProjectCard key={project.id} project={project} delay={index * 80} />
              ))}
            </div>
          ) : null}

          {state === "ready" && projects.length > 0 ? (
            <div style={{ marginTop: "var(--space-7)" }}>
              <Link to="/projetos" className="btn">
                <span>Ver todos os projetos</span>
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="processo">
        <div className="container">
          <div className="section__head">
            <p className="eyebrow" id="processo">
              Como trabalhamos
            </p>
            <div>
              <h2 className="section__title">Do primeiro levantamento à entrega da obra.</h2>
            </div>
          </div>

          <div className="process">
            {PROCESS.map((step, index) => (
              <Reveal key={step.title} as="div" className="process__step" delay={index * 70}>
                <span className="process__index">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="process__title">{step.title}</h3>
                <p className="process__text">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="cta grain" aria-labelledby="cta">
        <div className="container cta__inner">
          <Reveal>
            <div>
              <p className="eyebrow" id="cta" style={{ color: "rgba(251,250,247,.72)" }}>
                Novo projeto
              </p>
              <h2 className="cta__title" style={{ marginTop: "var(--space-4)" }}>
                O próximo projeto pode ser <em>o seu</em>.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="cta__aside">
              <p>
                Se tem uma ideia ou um projeto, fale connosco. Avaliamos o que pretende e preparamos um
                orçamento sem compromisso.
              </p>
              <div className="cta__actions">
                <Link to="/contactos" className="btn btn--accent">
                  <span>Pedir orçamento</span>
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link to="/servicos" className="btn btn--outline-light">
                  <span>Serviços</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
        <svg className="cta__mark" viewBox="0 0 200 320" fill="none" aria-hidden="true">
          <rect x="10" y="10" width="180" height="130" stroke="#f5f2ee" strokeWidth="6" />
          <rect x="10" y="180" width="180" height="130" stroke="#b35c44" strokeWidth="6" />
        </svg>
      </section>
    </>
  );
}
