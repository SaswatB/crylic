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

  setError(error: Error) {
    this.setState({ error });
  }

  resetError() {
    this.setState({ error: false });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            minHeight: "min-content",
            height: "100%",
            padding: 20,
            backgroundImage:
              "linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)",
            color: "white",
            textAlign: "center",
          }}
        >
          <span>An error occurred:</span>
          {error.message.length < 100 && (
            <span style={{ fontSize: 24 }}>{error.message}</span>
          )}
          <div
            style={{
              whiteSpace: "pre",
              overflow: "auto",
              width: "100%",
              background: "rgba(0,0,0,.5)",
              padding: "20px",
              margin: "20px",
              boxSizing: "border-box",
              // todo fix parent background if the frame is smaller than this height + title
              minHeight: "300px",
              minWidth: "300px",
              textAlign: "left",
            }}
          >
            {error.stack}
          </div>
        </div>
      );
    }
    return this.props.children || null;
  }
}
