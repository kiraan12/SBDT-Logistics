import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 min-h-[200px]">
          <p className="font-medium">Something went wrong on this page.</p>
          <button type="button" onClick={() => this.setState({ hasError: false })} className="mt-3 text-slate-600 underline">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
