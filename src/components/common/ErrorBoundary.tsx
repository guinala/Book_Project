import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // aquí iría vuestro envío a Sentry / un endpoint de logging
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Algo ha fallado. Recarga la página.</p>;
    }
    return this.props.children;
  }
}