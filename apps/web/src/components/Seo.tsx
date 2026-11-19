import { useEffect } from "react";

const SITE_URL = "https://obragoito.pt";
const DEFAULT_IMAGE = "/media/projects/saldanha.jpg";
const JSON_LD_ID = "obg-page-jsonld";

type SeoProps = {
  title: string;
  description: string;
  /** Rota canónica, por exemplo "/servicos". */
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  /** Dados estruturados adicionais (schema.org) para a página. */
  jsonLd?: Record<string, unknown>;
};

function absolute(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

/** SEO técnico por rota: canónica, redes sociais e dados estruturados. */
export function Seo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex,
  jsonLd,
}: SeoProps) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const url = absolute(path);
    const imageUrl = absolute(image);

    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    if (!noIndex) setLink("canonical", url);

    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);

    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    const blocks: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url,
        inLanguage: "pt-PT",
        isPartOf: { "@type": "WebSite", name: "Obragoito", url: `${SITE_URL}/` },
        publisher: { "@id": `${SITE_URL}/#organizacao` },
      },
    ];

    if (path !== "/") {
      blocks.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: title.split(" — ")[0], item: url },
        ],
      });
    }

    if (jsonLdKey) blocks.push(JSON.parse(jsonLdKey) as Record<string, unknown>);

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = JSON_LD_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
  }, [title, description, path, image, type, noIndex, jsonLdKey]);

  return null;
}
