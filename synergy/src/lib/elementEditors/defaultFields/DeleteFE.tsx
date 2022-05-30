import React from "react";
import { useSnackbar } from "notistack";

import { useService } from "../../../hooks/useService";
import { SelectService } from "../../../services/SelectService";
import { InputRowBlockButton } from "../InputRowWrapper";

export function DeleteFE() {
  const selectService = useService(SelectService);
  const { enqueueSnackbar } = useSnackbar();

  return (
    <InputRowBlockButton
      onClick={() =>
        selectService
          .deleteSelectedElement()
          .catch((e) =>
            enqueueSnackbar((e as Error).message, { variant: "error" })
          )
      }
    >
      Delete Element
    </InputRowBlockButton>
  );
}
