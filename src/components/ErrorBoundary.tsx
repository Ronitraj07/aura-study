/**
 * ErrorBoundary.tsx
 *
 * PHASE 8 — Error Boundaries
 * ───────────────────────────
 * React class component that catches runtime errors thrown by any
 * child subtree during rendering, in lifecycle methods, or in
 * constructors of child components.
 *
 * WHY A CLASS COMPONENT?
 * React's componentDidCatch / getDerivedStateFromError have no
 * hook equivalents — class components are the only way to implement
 * error boundaries in React 18.
 *
 * USAGE:
 *   <ErrorBoundary>
 *     <HeavyPage />
 *   </ErrorBoundary>
 *
 * The boundary resets when `resetKey` prop changes, so you can
 * force a retry by bumping a counter from the parent.
 */

import { Component, ReactNode, ErrorInfo } from "react";
import ErrorFallback from "./ErrorFallback";

interface Props {
  children: ReactNode;
  /** Optional key — change this value to programmatically reset the boundary */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  // Invoked when a descendant throws. Updates state so next render shows fallback.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Fires after the fallback render — good place to log to an error service.
  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to Sentry / LogRocket / etc.
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  // When resetKey changes (e.g. parent route remount), auto-reset the boundary.
  componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.reset();
    }
  }

  /** Call this to clear the error state and retry rendering children. */
  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          reset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
