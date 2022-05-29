import React from "react";

import { createElementEditorField } from "../ElementEditor";

function MessageFE({ message }: { message: string }) {
  return <div className="text-center">{message}</div>;
}

export const createMessageFE = (message: string) =>
  createElementEditorField(MessageFE, { message });
