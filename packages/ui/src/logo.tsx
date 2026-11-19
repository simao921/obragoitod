type LogoProps = {
  variant?: "dark" | "light";
  size?: "sm" | "md";
  showWordmark?: boolean;
};

export function Logo({ variant = "dark", size = "md", showWordmark = true }: LogoProps) {
  const color = variant === "light" ? "var(--white-warm)" : "var(--charcoal)";
  const accent = "var(--terracotta)";
  const scale = size === "sm" ? 0.8 : 1;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12 * scale,
        color,
      }}
    >
      <svg
        width={26 * scale}
        height={30 * scale}
        viewBox="0 0 26 30"
        fill="none"
        aria-hidden="true"
        style={{ flex: "0 0 auto" }}
      >
        <rect x="0.75" y="0.75" width="24.5" height="12" stroke={color} strokeWidth="1.5" />
        <rect x="0.75" y="17.25" width="24.5" height="12" stroke={accent} strokeWidth="1.5" />
      </svg>
      {showWordmark ? (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13 * scale,
            fontWeight: 600,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Obragoito
        </span>
      ) : null}
    </span>
  );
}
