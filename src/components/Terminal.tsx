import React, { FunctionComponent, useEffect, useRef } from "react";
import { Observable } from "rxjs";
import { Terminal as XtermTerminal } from "xterm";

import "xterm/css/xterm.css";

interface Props {
  writer: Observable<Buffer>;
}
export const Terminal: FunctionComponent<Props> = ({ writer }) => {
  const termRef = useRef(
    new XtermTerminal({
      disableStdin: true,
      convertEol: true,
      cols: 80,
      rows: 25,
    })
  );
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    termRef.current.open(containerRef.current!);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      termRef.current.dispose();
    };
  }, []);
  useEffect(() => {
    const subscription = writer.subscribe((chunk) => {
      termRef.current.write(chunk);
    });
    return () => subscription.unsubscribe();
  }, [writer]);

  return <div ref={containerRef} />;
};
