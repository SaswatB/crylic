import React, { ErrorInfo } from "react";

export class ErrorBoundary extends React.Component<{
  onError: (error: Error, errorInfo: ErrorInfo) => void;
}> {
  state = { error: false as Error | false };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
    this.setState({ error });
  }

  hasError() {
    return !!this.state.error;
  }

  resetError() {
    this.setState({ error: false });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="w-full h-full p-5 overflow-auto bg-gray-900 text-white text-sm whitespace-pre-wrap">
          {error.stack}
        </div>
      );
    }
    return this.props.children || null;
  }
}
