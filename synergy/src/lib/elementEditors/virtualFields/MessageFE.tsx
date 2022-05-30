import React from "react";

import { createElementEditorField } from "../ElementEditor";

function MessageFE({ message }: { message: string }) {
  return <div className="text-center opacity-80 p-3">{message}</div>;
}

export const createMessageFE = (message: string) =>
  createElementEditorField(MessageFE, { message });
