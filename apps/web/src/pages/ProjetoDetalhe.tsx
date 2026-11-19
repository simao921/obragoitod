import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingBlock } from "@obragoito/ui";
import { SERVICE_CATEGORIES, type ProjectSummary, type PublicProject } from "@obragoito/core";
import { Seo } from "../components/Seo";
import { ProjectCard } from "../components/ProjectCard";
import { fetchProject } from "../lib/projects";

export function ProjetoDetalhe() {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [related, setRelated] = useState<ProjectSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    fetchProject(slug)
      .then((data) => {
        if (!active) return;
        setProject(data.project);
        setRelated(data.related);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const status = (error as { status?: number }).status;
        setState(status === 404 ? "missing" : "error");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="container page-top">
        <LoadingBlock label="A carregar projeto…" />
      </div>
    );
  }

  if (state === "missing" || state === "error" || !project) {
    return (
      <div className="container page-top" style={{ paddingBottom: "var(--space-9)" }}>
        <p className="eyebrow">Projeto</p>
        <h1 className="page-hero__title" style={{ marginTop: "var(--space-4)" }}>
          {state === "missing" ? "Projeto não encontrado." : "Não foi possível carregar o projeto."}
        </h1>
        <p className="lede" style={{ marginTop: "var(--space-4)" }}>
          {state === "missing"
            ? "Esta obra pode já não estar publicada. Consulte o portefólio atualizado."
            : "O serviço de conteúdo está indisponível. Tente novamente dentro de instantes."}
        </p>
        <div style={{ marginTop: "var(--space-6)" }}>
          <Link to="/projetos" className="btn">
            <span>Ver projetos</span>
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const gallery = project.gallery.filter((image) => image.url);

  return (
    <>
      <Seo
        title={`${project.name} — Obragoito`}
        description={project.summary ?? `Projeto ${project.name} executado pela Obragoito.`}
        image={project.coverImage ?? undefined}
      />

      {project.coverImage ? (
        <div className="project-cover">
          <img
            src={project.coverImage}
            alt={project.coverImageAlt ?? `Obra ${project.name} executada pela Obragoito`}
            fetchPriority="high"
          />
        </div>
      ) : (
        <div style={{ height: "var(--header-h)" }} />
      )}

      <div className="container">
        <div className="project-head">
          <div>
            <p className="eyebrow">{SERVICE_CATEGORIES[project.category]}</p>
            <h1 className="project-head__title" style={{ marginTop: "var(--space-4)" }}>
              {project.name}
            </h1>
            {project.summary ? (
              <p className="lede" style={{ marginTop: "var(--space-4)" }}>
                {project.summary}
              </p>
            ) : null}
          </div>

          <dl className="project-facts">
            <div>
              <dt>Área</dt>
              <dd>{SERVICE_CATEGORIES[project.category]}</dd>
            </div>
            {project.location ? (
              <div>
                <dt>Localização</dt>
                <dd>{project.location}</dd>
              </div>
            ) : null}
            {project.year ? (
              <div>
                <dt>Ano</dt>
                <dd>{project.year}</dd>
              </div>
            ) : null}
            {project.clientName ? (
              <div>
                <dt>Cliente</dt>
                <dd>{project.clientName}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="project-body">
          <div className="project-body__text">
            {project.description ? (
              project.description.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p className="text-muted">Descrição detalhada a completar pela administração.</p>
            )}
            <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)" }}>
              Fotografias e informação publicadas pela Obragoito. Para detalhes sobre esta intervenção,
              contacte-nos.
            </p>
          </div>

          <aside>
            <div className="contact-block">
              <p className="contact-block__label">Próximo passo</p>
              <p className="contact-block__value">
                Quer uma obra com este nível de exigência?
              </p>
              <div style={{ marginTop: "var(--space-4)" }}>
                <Link to="/contactos" className="btn btn--sm">
                  <span>Pedir orçamento</span>
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {gallery.length > 1 ? (
          <div className="project-gallery" style={{ paddingBottom: "var(--space-8)" }}>
            {gallery.map((image) => (
              <img
                key={image.id}
                src={image.url ?? ""}
                alt={image.alt ?? image.caption ?? `Fotografia da obra ${project.name}`}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="section section--tight" style={{ borderTop: "1px solid var(--slate)" }}>
          <div className="container">
            <div className="section__head">
              <p className="eyebrow">Relacionados</p>
              <h2 className="section__title">Outras obras na mesma área.</h2>
            </div>
            <div className="projects-grid">
              {related.map((item, index) => (
                <ProjectCard key={item.id} project={item} delay={index * 70} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
