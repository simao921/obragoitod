import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, LoadingBlock } from "@obragoito/ui";
import { SERVICE_CATEGORIES, type ProjectSummary } from "@obragoito/core";
import { Seo } from "../components/Seo";
import { ProjectCard } from "../components/ProjectCard";
import { fetchProjects } from "../lib/projects";

const FILTERS = [
  { value: "todos", label: "Todos" },
  ...Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({ value, label })),
];

export function Projetos() {
  const [filter, setFilter] = useState("todos");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    fetchProjects(filter)
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
  }, [filter]);

  return (
    <>
      <Seo
        title="Projetos — Obragoito"
        description="Portefólio de obras da Obragoito: espaço público, infraestruturas, urbanismo, reabilitação e empreendimentos."
      />

      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Projetos</p>
          <h1 className="page-hero__title">Obras que continuam a fazer parte da cidade.</h1>
          <p className="page-hero__lede">
            Uma seleção de projetos desenvolvidos nas diferentes áreas de atuação da Obragoito. O portefólio é
            atualizado pela administração à medida que as obras são publicadas.
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          <div className="filters" role="group" aria-label="Filtrar projetos por área">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className="filter"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {state === "loading" ? <LoadingBlock label="A carregar projetos…" /> : null}

          {state === "error" ? (
            <EmptyState
              title="Não foi possível carregar os projetos"
              text="O serviço de conteúdo está indisponível neste momento. Tente novamente dentro de instantes ou contacte-nos directamente."
              action={
                <Link to="/contactos" className="btn btn--sm">
                  <span>Contactar</span>
                </Link>
              }
            />
          ) : null}

          {state === "ready" && projects.length === 0 ? (
            <EmptyState
              title="Sem projetos publicados nesta área"
              text="Ainda não existem obras publicadas para este filtro. Explore outras áreas ou fale connosco sobre o seu projeto."
              action={
                <button type="button" className="btn btn--sm" onClick={() => setFilter("todos")}>
                  Ver todos os projetos
                </button>
              }
            />
          ) : null}

          {state === "ready" && projects.length > 0 ? (
            <div className="projects-grid projects-grid--masonry">
              {projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} delay={index * 60} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="cta grain">
        <div className="container cta__inner">
          <div>
            <p className="eyebrow" style={{ color: "rgba(251,250,247,.6)" }}>
              Novo projeto
            </p>
            <h2 className="cta__title" style={{ marginTop: "var(--space-4)" }}>
              Tem uma obra em mente?
            </h2>
          </div>
          <div className="cta__aside">
            <p>Fale connosco para avaliarmos o que pretende e prepararmos um orçamento.</p>
            <div className="cta__actions">
              <Link to="/contactos" className="btn btn--accent">
                <span>Pedir orçamento</span>
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
