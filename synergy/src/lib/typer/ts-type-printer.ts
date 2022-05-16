import { TSTypeKind, TSTypeWrapper } from "./ts-type-wrapper";

export function printTSTypeWrapper(name: string, type: TSTypeWrapper) {
  return `type ${name} = ${printTSTypeWrapperHelper(type)};`;
}
function printTSTypeWrapperHelper(type: TSTypeWrapper): string {
  switch (type.kind) {
    case TSTypeKind.Unknown:
      return "unknown";
    case TSTypeKind.String:
      return "string";
    case TSTypeKind.Number:
      return "number";
    case TSTypeKind.Boolean:
      return "boolean";
    case TSTypeKind.Undefined:
      return "undefined";
    case TSTypeKind.Null:
      return "null";
    case TSTypeKind.LiteralString:
    case TSTypeKind.LiteralNumber:
      return JSON.stringify(type.value);

    case TSTypeKind.Object:
      return `{ ${type.props
        .map(
          (p) =>
            `${p.name}${p.optional ? "?" : ""}: ${printTSTypeWrapperHelper(
              p.type
            )}`
        )
        .join("; ")}; }`;
    case TSTypeKind.Array:
      return `${printTSTypeWrapperHelper(type.memberType)}[]`;
    case TSTypeKind.Tuple:
      return `[${type.memberTypes.map(printTSTypeWrapperHelper).join(", ")}]`;
    case TSTypeKind.Function:
      return `Function`;
    case TSTypeKind.Union:
      return `(${type.memberTypes.map(printTSTypeWrapperHelper).join(" | ")})`;
  }
}
