import { ReactNode } from "react";

interface PageWrapperProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
}

/** Reusable skeleton blocks */
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton rounded-2xl"
      style={{ height }}
    />
  );
}

export function SkeletonText({ width = "100%", height = "1em" }: { width?: string | number; height?: string | number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: "0.375rem", marginBottom: "0.5rem" }}
    />
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse" style={{ animationDuration: "0.01ms" }}>
      {/* Header */}
      <div className="space-y-2">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-text" style={{ width: "55%" }} />
      </div>
      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} height={110} />
        ))}
      </div>
      {/* Panel */}
      <SkeletonCard height={220} />
    </div>
  );
}

/** Standard page wrapper with header + optional skeleton */
export default function PageWrapper({
  title,
  subtitle,
  action,
  children,
  loading = false,
}: PageWrapperProps) {
  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-8">
      {(title || action) && (
        <div
          className="flex items-start justify-between gap-4"
          style={{ marginBottom: 0 }}
        >
          <div className="min-w-0">
            {title && (
              <h1 className="page-title">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="page-subtitle">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
