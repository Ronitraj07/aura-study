import { Sparkles } from "lucide-react";

const Footer = () => (
  <footer
    style={{
      borderTop: "1px solid hsl(240,10%,14%)",
      padding: "clamp(1.5rem,4vw,2.5rem) clamp(1rem,5vw,3rem)",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
    }}
  >
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: 24,
          height: 24,
          background: "var(--gradient-primary)",
        }}
      >
        <Sparkles size={11} style={{ color: "#fff" }} />
      </div>
      <span className="font-display font-semibold gradient-text" style={{ fontSize: "var(--text-sm)" }}>
        StudyAI
      </span>
    </div>
    <p style={{ fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}>
      © 2026 StudyAI. Built for academic excellence.
    </p>
  </footer>
);

export default Footer;
