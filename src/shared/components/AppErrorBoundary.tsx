import React, { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  private readonly content: ReactNode;

  constructor(props: Props) {
    super(props);
    this.content = props.children;
  }

  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failure", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen grid place-items-center bg-slate-50 px-6">
          <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">This page could not finish loading</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your information is safe. Refresh the page to reconnect and continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[#37494E] px-5 py-3 text-sm font-bold text-white"
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }
    return this.content;
  }
}
