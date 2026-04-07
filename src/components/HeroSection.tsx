import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HeroSection = () => {
  const { status } = useAuth();
  const primaryTo = status === "allowed" ? "/dashboard" : "/login";

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        minHeight: "92vh",
        padding: "clamp(4rem,12vw,10rem) clamp(1rem,5vw,3rem) clamp(3rem,8vw,6rem)",
      }}
    >
      {/* Ambient glows — clamped so they never trigger overflow on mobile */}
      <div
        className="hero-glow"
        style={{
          width: "min(600px, 90vw)",
          height: "min(600px, 90vw)",
          top: "-10%",
          left: "10%",
          background: "hsl(262,80%,62%)",
          opacity: 0.18,
        }}
      />
      <div
        className="hero-glow"
        style={{
          width: "min(500px, 80vw)",
          height: "min(500px, 80vw)",
          top: "20%",
          right: "5%",
          background: "hsl(220,85%,62%)",
          opacity: 0.14,
        }}
      />

      {/* Dot-grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, hsla(220,20%,60%,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMask: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
          mask: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* Eyebrow */}
      <div
        className="fade-up flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 sm:mb-8"
        style={{
          animationDelay: "0ms",
          background: "hsla(262,80%,62%,0.1)",
          border: "1px solid hsla(262,80%,62%,0.25)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "inline-flex",
        }}
      >
        <Sparkles size={12} style={{ color: "hsl(262,80%,72%)" }} />
        <span style={{ fontSize: "var(--text-xs)", color: "hsl(262,80%,75%)", fontWeight: 600 }}>
          AI-powered academic productivity
        </span>
      </div>

      {/* Headline — removed forced <br /> to allow natural responsive wrap */}
      <h1
        className="font-display font-bold fade-up"
        style={{
          animationDelay: "60ms",
          fontSize: "clamp(2rem, 7vw, 5.5rem)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          maxWidth: "820px",
          color: "hsl(var(--foreground))",
        }}
      >
        Your{" "}
        <span className="gradient-text">AI Academic</span>
        {" "}Assistant
      </h1>

      {/* Subheadline */}
      <p
        className="fade-up"
        style={{
          animationDelay: "120ms",
          fontSize: "clamp(0.9375rem, 2vw, 1.25rem)",
          color: "hsl(var(--muted-foreground))",
          maxWidth: 560,
          lineHeight: 1.65,
          marginTop: "clamp(0.75rem, 2vw, 1.75rem)",
          paddingInline: "var(--sp-2)",
        }}
      >
        Generate PPTs, write assignments, create notes, and manage your
        academic life — all in one beautifully designed workspace.
      </p>

      {/*
        CTA row — column on mobile (<480px), row on wider screens.
        Both buttons are full-width on mobile for easy tapping.
      */}
      <div
        className="fade-up"
        style={{
          animationDelay: "180ms",
          marginTop: "clamp(1.25rem, 3vw, 2.5rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--sp-3)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <style>{`
          @media (min-width: 480px) {
            .hero-cta-row {
              flex-direction: row !important;
              width: auto !important;
              max-width: none !important;
            }
            .hero-cta-row .btn-primary,
            .hero-cta-row .btn-secondary {
              width: auto !important;
            }
          }
        `}</style>
        <div
          className="hero-cta-row"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--sp-3)",
            width: "100%",
          }}
        >
          <Link
            to={primaryTo}
            className="btn btn-primary"
            style={{ padding: "12px 28px", fontSize: "var(--text-sm)", borderRadius: "0.75rem", width: "100%", justifyContent: "center" }}
          >
            <Zap size={15} />
            {status === "allowed" ? "Go to Dashboard" : "Try Now — it's free"}
          </Link>
          <a
            href="#features"
            className="btn btn-secondary"
            style={{ padding: "12px 24px", fontSize: "var(--text-sm)", borderRadius: "0.75rem", width: "100%", justifyContent: "center" }}
          >
            See Features <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* Social proof hint */}
      <p
        className="fade-up"
        style={{
          animationDelay: "260ms",
          fontSize: "var(--text-xs)",
          color: "hsl(var(--muted-foreground))",
          marginTop: "clamp(0.75rem, 2vw, 2rem)",
          opacity: 0.65,
          paddingInline: "var(--sp-4)",
        }}
      >
        No credit card required · Free to use · Private &amp; secure
      </p>
    </section>
  );
};

export default HeroSection;
