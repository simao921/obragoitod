import { pool, query } from "./db.js";
import { slugify } from "@obragoito/core";

/**
 * Conteúdo real confirmado no site institucional da Obragoito (obragoito.pt).
 * Não inclui clientes, trabalhadores nem obras fictícias.
 * Campos desconhecidos ficam a null para serem preenchidos na gestão.
 */
const REAL_PROJECTS = [
  {
    name: "Praça Duque de Saldanha",
    category: "urbanismo",
    location: "Lisboa",
    summary: "Intervenção de urbanismo na Praça Duque de Saldanha, em Lisboa.",
    description:
      "Obra de urbanismo e requalificação de espaço público na Praça Duque de Saldanha, em Lisboa, integrada no portefólio de obras públicas da Obragoito.",
    cover: "/media/projects/saldanha.jpg",
    alt: "Praça Duque de Saldanha, em Lisboa, com pavimento em calçada e zona arborizada",
    order: 1,
  },
  {
    name: "Praça Nuno Gonçalves",
    category: "urbanismo",
    location: "Lisboa",
    summary: "Reestruturação de espaço público na Praça Nuno Gonçalves.",
    description:
      "Projeto de urbanismo executado na Praça Nuno Gonçalves, em Lisboa, no âmbito das intervenções de espaço público da empresa.",
    cover: "/media/projects/praca-nuno-goncalves.jpg",
    alt: "Praça Nuno Gonçalves, em Lisboa, com pavimento e mobiliário urbano",
    order: 2,
  },
  {
    name: "Calçada de homenagem aos profissionais Covid",
    category: "urbanismo",
    location: null,
    summary: "Monumento em calçada de homenagem aos profissionais envolvidos na pandemia.",
    description:
      "Execução de calçada de homenagem aos profissionais envolvidos no combate à pandemia, apresentada no portefólio de urbanismo da Obragoito.",
    cover: "/media/projects/monumento-covid.jpg",
    alt: "Calçada de homenagem aos profissionais Covid, com desenho em pedra",
    order: 3,
  },
  {
    name: "Monumento de homenagem à agricultura",
    category: "urbanismo",
    location: null,
    summary: "Monumento em pedra integrado num largo urbano.",
    description:
      "Construção de monumento de homenagem à agricultura, integrado no conjunto de obras de urbanismo da empresa.",
    cover: "/media/projects/monumento-agricultura.jpg",
    alt: "Monumento de homenagem à agricultura, em pedra, num largo urbano",
    order: 4,
  },
  {
    name: "Parque Infantil Freeport",
    category: "infraestruturas",
    location: "Alcochete",
    summary: "Parque infantil integrado em infraestruturas de apoio à cidade.",
    description:
      "Execução de parque infantil no Freeport, em Alcochete, no âmbito das obras de infraestruturas da Obragoito.",
    cover: "/media/projects/freeport.jpg",
    alt: "Parque infantil do Freeport, em Alcochete, com estruturas de madeira",
    order: 5,
  },
  {
    name: "Rotunda de Benfica",
    category: "infraestruturas",
    location: "Lisboa",
    summary: "Infraestrutura viária na zona de Benfica, em Lisboa.",
    description:
      "Obra de infraestrutura viária na Rotunda de Benfica, em Lisboa, integrada no portefólio de obras públicas da empresa.",
    cover: "/media/projects/rotunda-benfica.jpg",
    alt: "Rotunda de Benfica, em Lisboa, com pavimento e ilha central",
    order: 6,
  },
] as const;

async function main() {
  for (const project of REAL_PROJECTS) {
    const slug = slugify(project.name);
    const existing = await query<{ id: string }>("select id from public.projects where slug = $1", [slug]);
    if (existing.rows.length > 0) {
      console.log(`[seed] ${slug} — já existe`);
      continue;
    }
    const inserted = await query<{ id: string }>(
      `insert into public.projects
         (slug, name, category, summary, description, location, cover_image, cover_image_alt, is_published, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       returning id`,
      [
        slug,
        project.name,
        project.category,
        project.summary,
        project.description,
        project.location,
        project.cover,
        project.alt,
        project.order,
      ],
    );
    await query(
      `insert into public.project_images (project_id, storage_path, alt, sort_order)
       values ($1, $2, $3, 0)`,
      [inserted.rows[0].id, project.cover, project.alt],
    );
    console.log(`[seed] ${slug} — criado`);
  }

  console.log("[seed] concluído");
  await pool.end();
}

main().catch(async (error) => {
  console.error("[seed] falhou:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
