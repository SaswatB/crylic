import React, { useMemo } from "react";
import { startCase } from "lodash";
import { useSnackbar } from "notistack";

import { Button } from "../../../components/base/Button";
import { SelectInput, TextInput } from "../../../hooks/useInput";
import { useObservable } from "../../../hooks/useObservable";
import {
  isSelectedElementTarget_NotRenderEntry,
  isSelectedElementTarget_RenderEntry,
  isSelectedElementTarget_VirtualComponent,
} from "../../../types/selected-element";
import { prettyPrintTS } from "../../ast/ast-helpers";
import { printTSTypeWrapper } from "../../typer/ts-type-printer";
import {
  TSTypeKind,
  TSTypeW_LiteralNumber,
  TSTypeW_LiteralString,
  TSTypeWrapper,
} from "../../typer/ts-type-wrapper";
import { produceNext } from "../../utils";
import {
  createElementEditorField,
  ElementEditorFieldProps,
} from "../ElementEditor";
import { InputRowWrapper } from "../InputRowWrapper";

interface VirtualPropFEProps extends ElementEditorFieldProps {
  name: string;
  type: TSTypeWrapper;
  optional: boolean;
}

function VirtualPropFE({
  selectedElement,
  name,
  type,
  optional,
  bindInitialValue,
  onChangeAttributes,
  openInEditor,
}: VirtualPropFEProps & { bindInitialValue?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const componentProps = useObservable(
    isSelectedElementTarget_RenderEntry(selectedElement)
      ? selectedElement.renderEntry.componentProps$
      : undefined
  );

  const label = startCase(`${name || ""}`);
  const initialValue = isSelectedElementTarget_RenderEntry(selectedElement)
    ? componentProps?.[name]
    : isSelectedElementTarget_VirtualComponent(selectedElement)
    ? selectedElement.target.sourceMetadata?.directProps[name]
    : undefined;
  const onChange = (value: unknown) =>
    isSelectedElementTarget_RenderEntry(selectedElement)
      ? produceNext(
          selectedElement.renderEntry.componentProps$,
          (draft) => (draft[name] = value)
        )
      : onChangeAttributes({ [name]: value });

  const renderStringInput = () => (
    <TextInput
      initialValue={initialValue as string}
      onChange={onChange}
      bindInitialValue={bindInitialValue}
    />
  );

  const renderSelectInput = (options: { name: string; value: unknown }[]) => (
    <SelectInput
      initialValue={JSON.stringify(initialValue)}
      options={options.map((o) => ({
        name: o.name,
        value: JSON.stringify(o.value),
      }))}
      onChange={(p) => onChange(JSON.parse(p))}
    />
  );

  const renderNumberInput = () => (
    <TextInput
      initialValue={`${initialValue ?? ""}`}
      onChange={(p) => onChange(parseFloat(p))}
      bindInitialValue={bindInitialValue}
    />
  );

  const renderType = (rType: TSTypeWrapper): JSX.Element | null => {
    switch (rType.kind) {
      case TSTypeKind.String:
        return renderStringInput();
      case TSTypeKind.Boolean:
        return renderSelectInput([
          { name: "True", value: true },
          { name: "False", value: false },
        ]);
      case TSTypeKind.Number:
        // todo label that this is a number
        return renderNumberInput();
      case TSTypeKind.LiteralString:
      case TSTypeKind.LiteralNumber:
        return renderSelectInput([
          { name: `${rType.value}`, value: rType.value },
        ]);
      case TSTypeKind.Union: {
        const memberKinds = new Set<TSTypeKind>();
        // todo should sub unions be flattened?
        rType.memberTypes.forEach((memberType) => {
          memberKinds.add(memberType.kind);
        });
        memberKinds.delete(TSTypeKind.Undefined); // todo handle these
        memberKinds.delete(TSTypeKind.Null);
        if (memberKinds.size === 1) {
          if (
            memberKinds.has(TSTypeKind.LiteralString) ||
            memberKinds.has(TSTypeKind.LiteralNumber)
          ) {
            return renderSelectInput(
              rType.memberTypes
                .filter(
                  (t): t is TSTypeW_LiteralString | TSTypeW_LiteralNumber =>
                    t.kind === TSTypeKind.LiteralString ||
                    t.kind === TSTypeKind.LiteralNumber
                )
                .map((t) => ({ name: `${t.value}`, value: t.value }))
            );
          }
          // todo is there a better way?
          const k = memberKinds.values().next().value;
          return renderType(rType.memberTypes.find((t) => t.kind === k)!);
        } else if (memberKinds.size === 2) {
          if (
            memberKinds.has(TSTypeKind.String) &&
            memberKinds.has(TSTypeKind.LiteralString)
          )
            return renderStringInput();
          else if (
            memberKinds.has(TSTypeKind.Number) &&
            memberKinds.has(TSTypeKind.LiteralNumber)
          )
            return renderNumberInput();
        }
      }
    }

    return null;
  };

  const typeString = useMemo(() => {
    const w = printTSTypeWrapper(name, type);
    try {
      return prettyPrintTS(w);
    } catch (e) {
      console.error(e);
      return w;
    }
  }, [name, type]);

  return (
    <InputRowWrapper
      label={label}
      tooltip={typeString}
      onClear={optional ? () => onChange(null) : undefined}
    >
      {renderType(type) || (
        <Button
          onClick={() =>
            isSelectedElementTarget_NotRenderEntry(selectedElement)
              ? openInEditor(selectedElement.target.lookupId, undefined)
              : // todo implement
                enqueueSnackbar("Editing this prop is not supported yet", {
                  variant: "warning",
                })
          }
        >
          Edit
        </Button>
      )}
    </InputRowWrapper>
  );
}
export const createVirtualPropFE = (prop: {
  name: string;
  type: TSTypeWrapper;
  optional: boolean;
}) =>
  createElementEditorField(VirtualPropFE, { ...prop, bindInitialValue: true });
