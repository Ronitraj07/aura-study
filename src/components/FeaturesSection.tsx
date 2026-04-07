/**
 * FeaturesSection.tsx
 *
 * UI FIX: The inline gridTemplateColumns style had CSS specificity higher
 * than the injected <style> media queries, so the mobile/tablet breakpoints
 * never fired. Fixed by removing the inline style and using a className +
 * injected CSS that targets the class. Also bumped section header mb to
 * use clamp() and made the hero card fully responsive.
 */

import { useEffect, useRef } from "react";
import {
  Presentation,
  FileText,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Presentation,
    title: "PPT Generator",
    description:
      "Turn any topic into structured, export-ready slides in seconds. Choose between compact outlines or Gamma-quality multi-slide decks with speaker notes.",
    accent: "hsl(262,80%,62%)",
    url: "/dashboard/ppt",
    hero: true,
  },
  {
    icon: FileText,
    title: "Assignments",
    description: "Formal, academic, or persuasive writing — structured and submission-ready.",
    accent: "hsl(220,85%,65%)",
    url: "/dashboard/assignments",
  },
  {
    icon: BookOpen,
    title: "Notes",
    description: "Headings, bullets, and a clean summary from any topic. Perfect for exam prep.",
    accent: "hsl(160,65%,48%)",
    url: "/dashboard/notes",
  },
  {
    icon: CalendarDays,
    title: "Timetable",
    description: "Color-coded weekly schedule with balanced hour distribution.",
    accent: "hsl(30,85%,58%)",
    url: "/dashboard/timetable",
  },
  {
    icon: CheckSquare,
    title: "Checklist",
    description: "Prioritized task lists with pending / completed sections.",
    accent: "hsl(320,65%,60%)",
    url: "/dashboard/checklist",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Core",
    description: "Every tool backed by state-of-the-art LLM APIs for consistent output.",
    accent: "hsl(50,80%,58%)",
    url: "/dashboard",
  },
];

function useScrollReveal(selector: string, staggerMs = 70) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(container.querySelectorAll<HTMLElement>(selector));

    if (reduced) {
      items.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = items.indexOf(el);
            setTimeout(() => el.classList.add("revealed"), idx * staggerMs);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, staggerMs]);

  return containerRef;
}

interface HeroCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  url: string;
}

function HeroCard({ icon: Icon, title, description, accent, url }: HeroCardProps) {
  return (
    <Link
      to={url}
      className="reveal-card glass-card card-interactive rounded-2xl feat-hero-card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "clamp(12px,3vw,20px)",
        padding: "clamp(18px,3.5vw,28px)",
        textDecoration: "none",
        borderTop: `2px solid ${accent}`,
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`Open ${title}`}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "min(240px, 60%)",
          height: 140,
          background: `radial-gradient(ellipse at top right, ${accent.replace(")", ", 0.07)").replace("hsl", "hsla")}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${accent.replace(")", ", 0.1)").replace("hsl", "hsla")}`,
          border: `1px solid ${accent.replace(")", ", 0.2)").replace("hsl", "hsla")}`,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        <Icon size={20} style={{ color: accent }} aria-hidden="true" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h3
            className="font-display font-bold"
            style={{ fontSize: "var(--text-lg)", color: "hsl(var(--foreground))", lineHeight: 1.25 }}
          >
            {title}
          </h3>
          <span
            className="flex items-center gap-1"
            style={{ fontSize: "var(--text-xs)", color: accent, fontWeight: 600, whiteSpace: "nowrap" }}
            aria-hidden="true"
          >
            Try it free <ArrowRight size={11} />
          </span>
        </div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.65,
            maxWidth: "60ch",
            wordBreak: "break-word",
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

interface RegularCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  url: string;
}

function RegularCard({ icon: Icon, title, description, accent, url }: RegularCardProps) {
  return (
    <Link
      to={url}
      className="reveal-card glass-card card-interactive rounded-2xl"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "clamp(16px,3vw,22px)",
        textDecoration: "none",
        borderTop: `2px solid ${accent}`,
        minHeight: "clamp(130px,20vw,160px)",
      }}
      aria-label={`Open ${title}`}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${accent.replace(")", ", 0.1)").replace("hsl", "hsla")}`,
          border: `1px solid ${accent.replace(")", ", 0.2)").replace("hsl", "hsla")}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: accent }} aria-hidden="true" />
      </div>

      <h3
        className="font-display font-semibold"
        style={{
          fontSize: "var(--text-base)",
          color: "hsl(var(--foreground))",
          marginBottom: 6,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "hsl(var(--muted-foreground))",
          lineHeight: 1.6,
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {description}
      </p>
    </Link>
  );
}

const FeaturesSection = () => {
  const gridRef = useScrollReveal(".reveal-card", 75);
  const [heroFeature, ...restFeatures] = features;

  return (
    <>
      <style>{`
        .reveal-card {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.45s cubic-bezier(0.16,1,0.3,1),
                      transform 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-card.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-card { opacity: 1; transform: none; transition: none; }
        }

        /* Hero card always spans full grid width */
        .feat-hero-card { grid-column: 1 / -1; }

        /* 
          Grid breakpoints — NOT inline styles so media queries can override.
          Mobile (default): 1 col
          Tablet 640px+: 2 cols
          Desktop 1024px+: 3 cols
        */
        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <section
        id="features"
        style={{
          padding: "clamp(3rem,8vw,7rem) clamp(1rem,5vw,3rem)",
          position: "relative",
        }}
      >
        {/* Section header */}
        <div
          className="text-center fade-up"
          style={{ marginBottom: "clamp(1.5rem,5vw,3rem)" }}
        >
          <p
            className="section-label"
            style={{ display: "inline-block", marginBottom: 12 }}
          >
            Features
          </p>
          <h2
            className="font-display font-bold"
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2.75rem)",
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
              maxWidth: 480,
              margin: "12px auto 0",
              lineHeight: 1.65,
              paddingInline: "var(--sp-4)",
            }}
          >
            Six powerful tools, one cohesive workspace. No tab-switching, no friction.
          </p>
        </div>

        <div ref={gridRef} className="features-grid">
          <HeroCard
            icon={heroFeature.icon}
            title={heroFeature.title}
            description={heroFeature.description}
            accent={heroFeature.accent}
            url={heroFeature.url}
          />
          {restFeatures.map((f) => (
            <RegularCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
              accent={f.accent}
              url={f.url}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default FeaturesSection;
