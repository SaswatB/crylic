import React, { ErrorInfo } from "react";

export class ErrorBoundary extends React.Component<{
  onError: (error: Error, errorInfo: ErrorInfo) => void;
}> {
  state = { hasError: false };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
    this.setState({ hasError: true });
  }

  hasError() {
    return this.state.hasError;
  }

  resetError() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children || null;
  }
}
