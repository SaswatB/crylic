import React from "react";

import { useService } from "../../../hooks/useService";
import { SelectService } from "../../../services/SelectService";

export function DeleteFE() {
  const selectService = useService(SelectService);

  return (
    <button
      className="btn col-span-2"
      onClick={() =>
        selectService
          .deleteSelectedElement()
          .catch((e) => alert((e as Error).message))
      }
    >
      Delete Element
    </button>
  );
}
