import { Presentation, FileText, BookOpen, CalendarDays, CheckSquare, Sparkles } from "lucide-react";

const features = [
  {
    icon: Presentation,
    title: "PPT Generator",
    description: "Basic or Gamma-quality slides generated from any topic. Structured, professional, export-ready.",
    gradient: "linear-gradient(135deg, hsl(262,80%,62%), hsl(280,70%,52%))",
    glow: "hsla(262,80%,62%,0.2)",
  },
  {
    icon: FileText,
    title: "Assignment Generator",
    description: "Structured academic writing in any tone — formal, academic, or persuasive — in seconds.",
    gradient: "linear-gradient(135deg, hsl(220,85%,62%), hsl(200,80%,52%))",
    glow: "hsla(220,85%,62%,0.2)",
  },
  {
    icon: BookOpen,
    title: "Notes Generator",
    description: "Turn any topic into headings, bullet-points, and a clean summary — perfect for exam prep.",
    gradient: "linear-gradient(135deg, hsl(160,70%,46%), hsl(175,65%,40%))",
    glow: "hsla(160,70%,46%,0.2)",
  },
  {
    icon: CalendarDays,
    title: "Timetable Builder",
    description: "Intelligent weekly schedule with color-coded subjects and balanced hour distribution.",
    gradient: "linear-gradient(135deg, hsl(30,85%,58%), hsl(12,78%,52%))",
    glow: "hsla(30,85%,58%,0.2)",
  },
  {
    icon: CheckSquare,
    title: "Checklist Manager",
    description: "Prioritized task lists with pending / completed sections and satisfying micro-interactions.",
    gradient: "linear-gradient(135deg, hsl(320,70%,58%), hsl(300,65%,52%))",
    glow: "hsla(320,70%,58%,0.2)",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Core",
    description: "Every tool powered by state-of-the-art LLM APIs for consistent, high-quality academic output.",
    gradient: "linear-gradient(135deg, hsl(50,85%,60%), hsl(35,80%,55%))",
    glow: "hsla(50,85%,60%,0.2)",
  },
];

const FeaturesSection = () => (
  <section
    style={{
      padding: "clamp(4rem,8vw,7rem) clamp(1rem,5vw,3rem)",
      position: "relative",
    }}
  >
    {/* Section label */}
    <div className="text-center mb-12">
      <p
        className="section-label"
        style={{ display: "inline-block", marginBottom: 12 }}
      >
        Features
      </p>
      <h2
        className="font-display font-bold"
        style={{
          fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
          lineHeight: 1.2,
          letterSpacing: "-0.015em",
        }}
      >
        Everything you need to{" "}
        <span className="gradient-text">excel academically</span>
      </h2>
      <p
        style={{
          fontSize: "var(--text-base)",
          color: "hsl(var(--muted-foreground))",
          marginTop: 12,
          maxWidth: 480,
          margin: "12px auto 0",
          lineHeight: 1.65,
        }}
      >
        Six powerful tools, one cohesive workspace. No tab-switching, no friction.
      </p>
    </div>

    {/* Feature grid */}
    <div
      className="grid gap-3"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
      }}
    >
      {features.map((f) => {
        const Icon = f.icon;
        return (
          <div
            key={f.title}
            className="glass-card rounded-2xl card-interactive group"
            style={{ padding: "22px 22px" }}
          >
            <div
              className="flex items-center justify-center rounded-xl mb-4"
              style={{
                width: 42,
                height: 42,
                background: f.gradient,
                boxShadow: `0 4px 16px ${f.glow}`,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <Icon size={18} style={{ color: "#fff" }} />
            </div>
            <h3
              className="font-display font-semibold"
              style={{ fontSize: "var(--text-base)", marginBottom: 6, lineHeight: 1.3 }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "hsl(var(--muted-foreground))",
                lineHeight: 1.6,
              }}
            >
              {f.description}
            </p>
          </div>
        );
      })}
    </div>
  </section>
);

export default FeaturesSection;
