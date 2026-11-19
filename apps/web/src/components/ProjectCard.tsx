import { Link } from "react-router-dom";
import { Reveal } from "@obragoito/ui";
import type { ProjectSummary } from "@obragoito/core";
import { SERVICE_CATEGORIES } from "@obragoito/core";

type ProjectCardProps = {
  project: ProjectSummary;
  feature?: boolean;
  delay?: number;
};

export function ProjectCard({ project, feature, delay = 0 }: ProjectCardProps) {
  return (
    <Reveal as="article" className={`project-card ${feature ? "project-card--feature" : ""}`.trim()} delay={delay}>
      <Link to={`/projetos/${project.slug}`} className="project-card__link">
        <div className="project-card__media">
          <span className="project-card__badge">{SERVICE_CATEGORIES[project.category]}</span>
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.coverImageAlt ?? `Obra ${project.name} executada pela Obragoito`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                background: "var(--stone-deep)",
                color: "var(--ink-muted)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Fotografia a confirmar
            </div>
          )}
        </div>
        <div className="project-card__meta">
          <h3 className="project-card__title">{project.name}</h3>
          <span className="project-card__place">
            {project.location ?? "Portugal"}
            {project.year ? ` · ${project.year}` : ""}
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
