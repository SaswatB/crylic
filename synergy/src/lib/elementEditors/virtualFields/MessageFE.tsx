import React from "react";

import { createElementEditorField } from "../ElementEditor";

function MessageFE({ message }: { message: string }) {
  return <>{message}</>;
}

export const createMessageFE = (message: string) =>
  createElementEditorField(MessageFE, { message });
