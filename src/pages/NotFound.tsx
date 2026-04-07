import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden"
      style={{ padding: "clamp(24px, 6vw, 48px)" }}
    >
      {/* Ambient glow */}
      <div
        className="hero-glow"
        style={{
          width: "min(400px, 70vw)",
          height: "min(400px, 70vw)",
          background: "hsl(var(--primary))",
          opacity: 0.12,
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div
        className="relative z-10 glass-card rounded-2xl text-center fade-up"
        style={{
          padding: "clamp(32px, 6vw, 56px) clamp(24px, 5vw, 48px)",
          maxWidth: 420,
          width: "100%",
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: "hsla(262,80%,62%,0.12)",
            border: "1px solid hsla(262,80%,62%,0.2)",
          }}
        >
          <AlertCircle size={28} style={{ color: "hsl(262,80%,72%)" }} />
        </div>

        <h1
          className="font-display font-bold gradient-text"
          style={{ fontSize: "clamp(2.5rem, 10vw, 4rem)", lineHeight: 1, marginBottom: 8 }}
        >
          404
        </h1>
        <p
          className="font-display font-semibold"
          style={{
            fontSize: "var(--text-lg)",
            color: "hsl(var(--foreground))",
            marginBottom: 8,
          }}
        >
          Page not found
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <Link
          to="/"
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px 24px", justifyContent: "center" }}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
