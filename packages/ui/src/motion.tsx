import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade" | "line";
  /** Elemento a renderizar (ex.: "article", "section", "li"). */
  as?: ElementType;
};

/** Entrada suave ao entrar no ecrã; neutra quando o sistema pede menos movimento. */
export function Reveal({ children, className = "", delay = 0, variant = "fade", as = "div" }: RevealProps) {
  const Tag = as;
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  const classes = [variant === "line" ? "reveal-line" : "reveal", visible ? "is-visible" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={ref} className={classes} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {variant === "line" ? <span>{children}</span> : children}
    </Tag>
  );
}

/** Parallax discreto, desligado com prefers-reduced-motion. */
export function useParallax<T extends HTMLElement>(strength = 0.12) {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      element.style.transform = `translate3d(0, ${(-offset * strength).toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      element.style.transform = "";
    };
  }, [reduced, strength]);

  return ref;
}
