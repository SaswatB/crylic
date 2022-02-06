import React, { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { Observable } from "rxjs";
import { Terminal as XtermTerminal } from "xterm";

import "xterm/css/xterm.css";

interface Props {
  writer: Observable<Buffer>;
}
export const Terminal: FunctionComponent<Props> = ({ writer }) => {
  const term = useMemo(
    () =>
      new XtermTerminal({
        disableStdin: true,
        convertEol: true,
        cols: 80,
        rows: 25,
      }),
    []
  );
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    term.open(containerRef.current!);

    // allow copying from the terminal
    term.attachCustomKeyEventHandler((arg) => {
      if (
        (arg.ctrlKey || arg.metaKey) &&
        arg.code === "KeyC" &&
        arg.type === "keydown"
      ) {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          return false;
        }
      }
      return true;
    });

    return () => term.dispose();
  }, [term]);
  useEffect(() => {
    const subscription = writer.subscribe((chunk) => term.write(chunk));
    return () => subscription.unsubscribe();
  }, [term, writer]);

  return <div ref={containerRef} />;
};
