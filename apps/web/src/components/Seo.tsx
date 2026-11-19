import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
};

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/** SEO técnico mínimo, sem dependências. */
export function Seo({ title, description, image = "/media/projects/saldanha.jpg", noIndex }: SeoProps) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:image"]', "property", "og:image", image);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  }, [title, description, image, noIndex]);

  return null;
}
