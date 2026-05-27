export default function LogoNextgen({ scale = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{
        fontFamily: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif",
        fontSize: 11 * scale,
        fontWeight: 700,
        color: "#FFFFFF",
        letterSpacing: "0.22em",
        opacity: 0.7,
        lineHeight: 1,
      }}>
        CI&amp;T
      </div>
      <div style={{
        fontFamily: "'DM Sans', Arial, sans-serif",
        fontSize: 25 * scale,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: "0.06em",
        lineHeight: 1,
        transform: "scaleX(0.86)",
        transformOrigin: "center",
        whiteSpace: "nowrap",
      }}>
        NEXTGEN AI
      </div>
    </div>
  );
}
