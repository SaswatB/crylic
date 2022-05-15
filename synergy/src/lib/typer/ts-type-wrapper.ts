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
  Enum = "enum",
  Union = "union",
}

export interface TSTypeW_Basic {
  kind:
    | TSTypeKind.Unknown
    | TSTypeKind.String
    | TSTypeKind.Number
    | TSTypeKind.Boolean
    | TSTypeKind.Undefined
    | TSTypeKind.Null;
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
  | TSTypeW_LiteralString
  | TSTypeW_LiteralNumber
  | TSTypeW_Object
  | TSTypeW_Array
  | TSTypeW_Tuple
  | TSTypeW_Function
  | TSTypeW_Union;
