import React from "react";
import { useSnackbar } from "notistack";

import { useService } from "../../../hooks/useService";
import { SelectService } from "../../../services/SelectService";

export function DeleteFE() {
  const selectService = useService(SelectService);
  const { enqueueSnackbar } = useSnackbar();

  return (
    <button
      className="btn col-span-2"
      onClick={() =>
        selectService
          .deleteSelectedElement()
          .catch((e) =>
            enqueueSnackbar((e as Error).message, { variant: "error" })
          )
      }
    >
      Delete Element
    </button>
  );
}
