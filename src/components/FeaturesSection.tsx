/**
 * FeaturesSection.tsx
 *
 * PHASE 4 CHANGES
 * ────────────────
 * 1. id="features" added to <section> so the HeroSection "See Features"
 *    anchor link actually scrolls here.
 *
 * 2. BROKE THE ICON-IN-COLORED-CIRCLE PATTERN.
 *    The previous layout was textbook AI-aesthetic:
 *    - Every card: gradient circle bg + icon inside + title + 2-line desc.
 *    - 6 identical cards in a uniform auto-fill grid.
 *    Replaced with a BENTO layout (2-column asymmetric on desktop):
 *    - First feature (PPT) gets a wide "hero" card spanning 2 columns.
 *    - Remaining 5 sit in a 3-col sub-grid of equal cards.
 *    - Icons are now bare (no background circle). They sit left of the
 *      title on the hero card and above title on regular cards.
 *    - Color accent is on the icon itself + a subtle left border line,
 *      not a filled circle behind it.
 *    - Cards have a faint colored top-border accent (2px) instead of
 *      a circle. Visual hierarchy without the template look.
 *
 * 3. STAGGERED INTERSECTION OBSERVER SCROLL REVEALS.
 *    Previously the section had no entrance animation — it just appeared.
 *    Now each card fades up with a staggered delay as it enters the viewport,
 *    using a lightweight IntersectionObserver hook instead of adding a
 *    full Framer Motion dependency to a static section.
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
    hero: true, // spans 2 cols on desktop
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

// ── Lightweight scroll-reveal hook ─────────────────────────────────────
function useScrollReveal(selector: string, staggerMs = 70) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion — skip animation entirely
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

// ── Hero card (wide, 2-col span) ───────────────────────────────────────
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
      className="reveal-card glass-card card-interactive rounded-2xl"
      style={{
        gridColumn: "1 / -1", // spans full width of the sub-grid it’s in
        display: "flex",
        alignItems: "flex-start",
        gap: 20,
        padding: "28px 28px",
        textDecoration: "none",
        borderTop: `2px solid ${accent}`,
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`Open ${title}`}
    >
      {/* Subtle accent wash in the top-right corner — not a blob, just a
          radial gradient that fades to transparent so it’s atmosphere,
          not decoration */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 240,
          height: 140,
          background: `radial-gradient(ellipse at top right, ${accent.replace(")", ", 0.07)").replace("hsl", "hsla")}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Bare icon — no circle background */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${accent.replace(")", ", 0.1)").replace("hsl", "hsla")}`,
          border: `1px solid ${accent.replace(")", ", 0.2)").replace("hsl", "hsla")}`,
          marginTop: 2,
        }}
      >
        <Icon size={20} style={{ color: accent }} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h3
            className="font-display font-bold"
            style={{ fontSize: "var(--text-lg)", color: "hsl(var(--foreground))", lineHeight: 1.25 }}
          >
            {title}
          </h3>
          <span
            className="flex items-center gap-1"
            style={{ fontSize: "var(--text-xs)", color: accent, fontWeight: 600 }}
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
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

// ── Regular card ───────────────────────────────────────────────────────────
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
        padding: "22px 22px",
        textDecoration: "none",
        borderTop: `2px solid ${accent}`,
      }}
      aria-label={`Open ${title}`}
    >
      {/* Icon: tinted bg square, no gradient circle */}
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
        }}
      >
        {description}
      </p>
    </Link>
  );
}

// ── Section ─────────────────────────────────────────────────────────────
const FeaturesSection = () => {
  // Attach the scroll-reveal observer to .reveal-card elements
  const gridRef = useScrollReveal(".reveal-card", 75);
  const [heroFeature, ...restFeatures] = features;

  return (
    <>
      {/*
        Inject the scroll-reveal CSS once, inline in this component.
        .reveal-card starts hidden (opacity:0, translateY:16px) and
        transitions to visible when .revealed is added by the observer.
        prefers-reduced-motion: .revealed is added immediately with no
        transition (handled in the hook above).
      */}
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
      `}</style>

      {/*
        FIX 4.1: id="features" — the HeroSection “See Features” button
        href="#features" now actually scrolls here.
      */}
      <section
        id="features"
        style={{
          padding: "clamp(4rem,8vw,7rem) clamp(1rem,5vw,3rem)",
          position: "relative",
        }}
      >
        {/* Section header */}
        <div className="text-center mb-12 fade-up">
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
              maxWidth: 480,
              margin: "12px auto 0",
              lineHeight: 1.65,
            }}
          >
            Six powerful tools, one cohesive workspace. No tab-switching, no friction.
          </p>
        </div>

        {/*
          FIX 4.2: BENTO GRID
          ────────────────
          Desktop (3 cols): hero card spans full width (row 1),
          then 5 regular cards in a 3-col grid below it.
          Tablet (2 cols): hero spans 2 cols, rest wrap naturally.
          Mobile (1 col): hero and cards stack vertically.

          This breaks the “6 identical cards” pattern — the hero card
          is visually distinct (wider, more detail, different layout)
          while regular cards are compact and focused.
        */}
        <div
          ref={gridRef}
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          className="features-grid"
        >
          {/* Wide hero card */}
          <HeroCard
            icon={heroFeature.icon}
            title={heroFeature.title}
            description={heroFeature.description}
            accent={heroFeature.accent}
            url={heroFeature.url}
          />
          {/* Remaining 5 regular cards */}
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

        {/* Responsive: collapse to 1-col on mobile, 2-col on tablet */}
        <style>{`
          @media (max-width: 767px) {
            .features-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .features-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}</style>
      </section>
    </>
  );
};

export default FeaturesSection;
