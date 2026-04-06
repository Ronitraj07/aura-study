import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HeroSection = () => {
  // FIX 1.3: Use auth status to route the primary CTA correctly.
  // - Allowed (logged-in) users → /dashboard  (no point sending them to /login)
  // - Everyone else            → /login
  // The secondary "Sign In" button always goes to /login.
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
      {/* Ambient glows — explicit dimensions so blur renders correctly */}
      <div
        className="hero-glow"
        style={{
          width: 600, height: 600,
          top: "-10%", left: "10%",
          background: "hsl(262,80%,62%)",
          opacity: 0.18,
        }}
      />
      <div
        className="hero-glow"
        style={{
          width: 500, height: 500,
          top: "20%", right: "5%",
          background: "hsl(220,85%,62%)",
          opacity: 0.14,
        }}
      />

      {/* Dot-grid pattern
          FIX 1.3: Added -webkit-mask for Safari — without it the radial
          fade-out mask has no effect in WebKit browsers, leaving a hard
          rectangular grid edge visible. */}
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
        className="fade-up flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
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

      {/* Headline */}
      <h1
        className="font-display font-bold fade-up"
        style={{
          animationDelay: "60ms",
          fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          maxWidth: "820px",
          color: "hsl(var(--foreground))",
        }}
      >
        Your{" "}
        <span className="gradient-text">AI Academic</span>
        <br />
        Assistant
      </h1>

      {/* Subheadline */}
      <p
        className="fade-up"
        style={{
          animationDelay: "120ms",
          fontSize: "clamp(1rem, 2vw, 1.25rem)",
          color: "hsl(var(--muted-foreground))",
          maxWidth: 560,
          lineHeight: 1.65,
          marginTop: "clamp(1rem, 2.5vw, 1.75rem)",
        }}
      >
        Generate PPTs, write assignments, create notes, and manage your
        academic life — all in one beautifully designed workspace.
      </p>

      {/* CTA row
          FIX 1.3: "Try Now" is the primary action — it routes to /dashboard
          if the user is already signed in, otherwise to /login. The secondary
          "Sign In" button is removed (redundant with Try Now for unauthenticated
          users) and replaced with a "See Features" anchor that scrolls down to
          FeaturesSection. This gives the two buttons distinct purposes. */}
      <div
        className="fade-up flex flex-wrap items-center justify-center gap-3"
        style={{
          animationDelay: "180ms",
          marginTop: "clamp(1.5rem, 3vw, 2.5rem)",
        }}
      >
        <Link
          to={primaryTo}
          className="btn btn-primary"
          style={{ padding: "12px 28px", fontSize: "var(--text-sm)", borderRadius: "0.75rem" }}
        >
          <Zap size={15} />
          {status === "allowed" ? "Go to Dashboard" : "Try Now — it's free"}
        </Link>
        <a
          href="#features"
          className="btn btn-secondary"
          style={{ padding: "12px 24px", fontSize: "var(--text-sm)", borderRadius: "0.75rem" }}
        >
          See Features <ArrowRight size={14} />
        </a>
      </div>

      {/* Social proof hint */}
      <p
        className="fade-up"
        style={{
          animationDelay: "260ms",
          fontSize: "var(--text-xs)",
          color: "hsl(var(--muted-foreground))",
          marginTop: "clamp(1rem, 2.5vw, 2rem)",
          opacity: 0.65,
        }}
      >
        No credit card required · Free to use · Private &amp; secure
      </p>
    </section>
  );
};

export default HeroSection;
