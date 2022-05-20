export enum TSTypeKind {
  Unknown = "unknown",
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Undefined = "undefined",
  Null = "null",
  LiteralString = "literalString",
  LiteralNumber = "literalNumber",
  Object = "object",
  Array = "array",
  Tuple = "tuple",
  Function = "function",
  Union = "union",
}

export interface TSTypeW_Basic {
  kind:
    | TSTypeKind.String
    | TSTypeKind.Number
    | TSTypeKind.Boolean
    | TSTypeKind.Undefined
    | TSTypeKind.Null;
}

export interface TSTypeW_Unknown {
  kind: TSTypeKind.Unknown;
  omittedDueToDepth?: boolean;
}

export interface TSTypeW_LiteralString {
  kind: TSTypeKind.LiteralString;
  value: string;
}
export interface TSTypeW_LiteralNumber {
  kind: TSTypeKind.LiteralNumber;
  value: number;
}

export interface TSTypeW_Object {
  kind: TSTypeKind.Object;
  props: {
    name: string;
    type: TSTypeWrapper;
    optional: boolean;
  }[];
}

export interface TSTypeW_Array {
  kind: TSTypeKind.Array;
  memberType: TSTypeWrapper;
}
export interface TSTypeW_Tuple {
  kind: TSTypeKind.Tuple;
  memberTypes: TSTypeWrapper[];
}

export interface TSTypeW_Function {
  kind: TSTypeKind.Function;
  // todo add params and return type
}

export interface TSTypeW_Union {
  kind: TSTypeKind.Union;
  memberTypes: TSTypeWrapper[];
}

// todo enums currently get folded into unions, they should be handled separately
export type TSTypeWrapper =
  | TSTypeW_Basic
  | TSTypeW_Unknown
  | TSTypeW_LiteralString
  | TSTypeW_LiteralNumber
  | TSTypeW_Object
  | TSTypeW_Array
  | TSTypeW_Tuple
  | TSTypeW_Function
  | TSTypeW_Union;

/**
 * Creates a value that should match the given type
 */
export function getPlaceholderTSTypeWrapperValue(type: TSTypeWrapper): unknown {
  switch (type.kind) {
    case TSTypeKind.String:
      return "placeholder";
    case TSTypeKind.Number:
      return 0;
    case TSTypeKind.Boolean:
      return false;
    case TSTypeKind.Undefined:
      return undefined;
    case TSTypeKind.Null:
      return null;
    case TSTypeKind.LiteralString:
    case TSTypeKind.LiteralNumber:
      return type.value;
    case TSTypeKind.Object:
      return type.props
        .filter((p) => !p.optional)
        .reduce(
          (obj, p) => ({
            ...obj,
            [p.name]: getPlaceholderTSTypeWrapperValue(p.type),
          }),
          {}
        );
    case TSTypeKind.Array:
      return [];
    case TSTypeKind.Tuple:
      return [type.memberTypes.map((p) => getPlaceholderTSTypeWrapperValue(p))];
    case TSTypeKind.Function:
      return () => void 0;
    case TSTypeKind.Union:
      // todo prefer undefined in a union
      return getPlaceholderTSTypeWrapperValue(type.memberTypes[0]!);
  }
  return undefined;
}
