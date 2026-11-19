/**
 * Factos confirmados sobre a Obragoito.
 * Fonte: obragoito.pt (página inicial, sobre e contactos), consultado em 2026-11-19.
 * Qualquer dado aqui deve poder ser confirmado. Não acrescentar factos não verificados.
 */

export const COMPANY = {
  name: "Obragoito",
  legalName: "Obragoito – Construções e Obras Públicas, Lda.",
  tagline: "Construção, remodelação e obras públicas",
  foundedYear: 1991,
  address: {
    street: "Quinta do Almargem, Chilreira",
    postalCode: "2705-570",
    city: "São João das Lampas",
    country: "Portugal",
  },
  phone: "21 960 5500",
  phoneHref: "+351219605500",
  email: "obragoito@obragoito.pt",
  social: {
    facebook: "https://www.facebook.com/share/1E2jEP8KoM/",
    instagram: "https://www.instagram.com/obragoito",
  },
} as const;

export const COMPANY_ADDRESS_LINE = `${COMPANY.address.street}, ${COMPANY.address.postalCode} ${COMPANY.address.city}`;

/** Indicadores publicados pela própria empresa. */
export const COMPANY_FACTS = [
  { value: "1991", label: "Ano de fundação" },
  { value: "35+", label: "Anos de atividade" },
  { value: "250+", label: "Obras realizadas" },
] as const;

export type ServiceCategory =
  | "obras-publicas"
  | "infraestruturas"
  | "urbanismo"
  | "reabilitacao"
  | "empreendimentos";

export type Service = {
  slug: ServiceCategory;
  title: string;
  short: string;
  description: string;
  material: string;
  image: string;
  imageAlt: string;
};

/**
 * Áreas de negócio tal como a empresa as apresenta no site atual.
 * As descrições são paráfrases do texto publicado pela Obragoito.
 */
export const SERVICES: Service[] = [
  {
    slug: "obras-publicas",
    title: "Obras Públicas",
    short: "Intervenções em espaço público",
    description:
      "Executamos obras para entidades públicas com coordenação de prazos, segurança em obra e cumprimento do caderno de encargos.",
    material: "Pedra e calçada",
    image: "/media/projects/saldanha.jpg",
    imageAlt: "Praça urbana pavimentada com calçada portuguesa e arborização",
  },
  {
    slug: "infraestruturas",
    title: "Infraestruturas",
    short: "Parques, rotundas e arruamentos",
    description:
      "Realizamos projetos de infraestruturas públicas, desde praças e rotundas a parques infantis e espaços de apoio à cidade.",
    material: "Betão e aço",
    image: "/media/projects/freeport.jpg",
    imageAlt: "Parque infantil com estruturas de madeira e pavimento contínuo",
  },
  {
    slug: "urbanismo",
    title: "Urbanismo",
    short: "Espaço público e monumentos",
    description:
      "Materializamos projetos de urbanismo e de reestruturação de áreas públicas, incluindo monumentos e homenagens.",
    material: "Terra e pedra",
    image: "/media/projects/monumento-agricultura.jpg",
    imageAlt: "Monumento em pedra integrado num largo urbano",
  },
  {
    slug: "reabilitacao",
    title: "Reabilitação",
    short: "Edifícios e habitação",
    description:
      "Construímos e reabilitamos edifícios empresariais e habitacionais, preservando o que existe e melhorando o desempenho do construído.",
    material: "Argamassa e madeira",
    image: "/media/projects/reabilitacao.jpg",
    imageAlt: "Interior de edifício em reabilitação com estrutura aparente",
  },
  {
    slug: "empreendimentos",
    title: "Empreendimentos",
    short: "Loteamentos e novos bairros",
    description:
      "Criamos loteamentos e empreendimentos que dão lugar a novos bairros habitacionais, do movimento de terras à entrega.",
    material: "Terreno e betão",
    image: "/media/projects/empreendimentos.jpg",
    imageAlt: "Estrutura de betão de um empreendimento habitacional em construção",
  },
];

export const SERVICE_CATEGORIES: Record<ServiceCategory, string> = {
  "obras-publicas": "Obras Públicas",
  infraestruturas: "Infraestruturas",
  urbanismo: "Urbanismo",
  reabilitacao: "Reabilitação",
  empreendimentos: "Empreendimentos",
};
