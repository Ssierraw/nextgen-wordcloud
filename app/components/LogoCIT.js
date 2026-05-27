export default function LogoCIT({ size = 48, color = "#FA5A50" }) {
  return (
    <span
      style={{
        fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
        fontWeight: 900,
        fontSize: size,
        color: color,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        display: "block",
        userSelect: "none",
      }}
    >
      CI&amp;T
    </span>
  );
}
