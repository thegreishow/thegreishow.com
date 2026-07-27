import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The Grei Show React shell failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="react-fallback">
          <p className="section-kicker">Signal interrupted</p>
          <h1>The live site is still available.</h1>
          <p>The React enhancement layer encountered a problem, but the production experience remains untouched.</p>
          <a className="home-button primary" href="/">Return to the live homepage</a>
        </main>
      );
    }

    return this.props.children;
  }
}
