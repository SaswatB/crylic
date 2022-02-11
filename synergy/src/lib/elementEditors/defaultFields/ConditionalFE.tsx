import React from "react";

import {
  createElementEditorField,
  ElementEditorFieldEntry,
  ElementEditorFieldProps,
} from "../ElementEditor";

export const createConditionalFE = <T extends {}>(
  { component: Component, props }: ElementEditorFieldEntry<T>,
  condition: (props: T & ElementEditorFieldProps) => boolean
) =>
  createElementEditorField(function ConditionalFE(p) {
    return condition(p) ? <Component {...p} /> : null;
  }, props);
