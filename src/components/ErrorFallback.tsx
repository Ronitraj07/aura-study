/**
 * ErrorFallback.tsx
 *
 * PHASE 8 — Error Boundaries
 * ───────────────────────────
 * The UI shown when an ErrorBoundary catches a crash.
 *
 * Design:
 * - Matches the dark glass-card aesthetic of the dashboard
 * - Warm, non-technical message so users aren't alarmed
 * - Collapsible <details> block for the raw error (useful for devs)
 * - 'Try again' resets the boundary in-place (no full page reload)
 * - 'Go to Dashboard' is an escape hatch back to a known-good route
 * - role="alert" + aria-live="assertive" so screen readers announce it
 * - Framer Motion fade + slide-up entrance
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  error: Error | null;
  reset: () => void;
}

const ErrorFallback = ({ error, reset }: Props) => (
  <motion.div
    role="alert"
    aria-live="assertive"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    className="flex items-center justify-center min-h-[60vh] p-6"
  >
    <div
      className="glass-card w-full max-w-md p-8 flex flex-col items-center gap-6 text-center"
      style={{
        background: "hsl(240 16% 8% / 0.9)",
        border: "1px solid hsl(240 16% 18%)",
        borderRadius: "var(--radius-xl, 1rem)",
        boxShadow: "0 12px 40px hsl(0 0% 0% / 0.4)",
      }}
    >
      {/* Icon */}
      <span
        className="flex items-center justify-center w-14 h-14 rounded-full"
        style={{
          background: "hsl(350 80% 55% / 0.12)",
          border: "1px solid hsl(350 80% 55% / 0.25)",
        }}
        aria-hidden="true"
      >
        <AlertTriangle
          size={28}
          style={{ color: "hsl(350 80% 65%)" }}
          strokeWidth={1.75}
        />
      </span>

      {/* Message */}
      <div className="flex flex-col gap-2">
        <h2
          className="font-semibold"
          style={{ fontSize: "var(--text-lg, 1.25rem)", color: "hsl(240 10% 92%)" }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "hsl(240 8% 60%)",
            lineHeight: 1.6,
            maxWidth: "36ch",
          }}
        >
          This section ran into an unexpected error. Your other pages and data
          are unaffected.
        </p>
      </div>

      {/* Collapsible error detail — helpful for devs, hidden by default */}
      {error && (
        <details
          className="w-full text-left"
          style={{ fontSize: "var(--text-xs, 0.75rem)" }}
        >
          <summary
            className="cursor-pointer select-none"
            style={{ color: "hsl(240 8% 50%)", marginBottom: "0.5rem" }}
          >
            Error details
          </summary>
          <pre
            className="overflow-x-auto"
            style={{
              background: "hsl(240 16% 6%)",
              border: "1px solid hsl(240 16% 14%)",
              borderRadius: "0.375rem",
              padding: "0.75rem",
              color: "hsl(350 70% 65%)",
              fontSize: "0.7rem",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={reset}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          style={{ minHeight: "44px" }}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Try again
        </button>

        <Link
          to="/dashboard"
          onClick={reset}
          className="btn btn-ghost flex-1 flex items-center justify-center gap-2"
          style={{ minHeight: "44px" }}
        >
          <Home size={15} aria-hidden="true" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  </motion.div>
);

export default ErrorFallback;
