import { parse, print, types, visit } from "recast";
import { NodePath } from "ast-types/lib/node-path";
import { DIV_LOOKUP_DATA_ATTR } from "./constants";

const { format } = __non_webpack_require__(
  "prettier"
) as typeof import("prettier");
const { builders: b } = types;

export const addDataAttrToJSXElements = (code: string) => {
  const ast = parse(code, {
    parser: require("recast/parsers/babel"),
  });
  let count = 0;
  visit(ast, {
    visitJSXOpeningElement(path) {
      console.log(path);
      const attr = b.jsxAttribute(
        b.jsxIdentifier(`data-${DIV_LOOKUP_DATA_ATTR}`),
        b.stringLiteral(`${count++}`)
      );
      path.value.attributes.push(attr);
      this.traverse(path);
    },
  });
  return print(ast).code;
}

export const removeDataAttrFromJSXElementsAndEditJSXElement = (code: string, editLookupId?: string, editElement?: (element: NodePath<types.namedTypes.JSXElement, any>) => void) => {
  const ast = parse(code, { parser: require("recast/parsers/babel") });
  visit(ast, {
    visitJSXElement(path) {
      console.log(path);
      if (editLookupId !== undefined &&
        path.value.openingElement.attributes.find(
          (attr: any) =>
            attr.name.name === `data-${DIV_LOOKUP_DATA_ATTR}` &&
            attr.value.value === editLookupId
        )
      ) {
        editElement?.(path);
      }
      path.value.openingElement.attributes = path.value.openingElement.attributes.filter(
        (attr: any) => attr.name.name !== `data-${DIV_LOOKUP_DATA_ATTR}`
      );
      this.traverse(path);
    },
  });
  return format(print(ast).code, { parser: "babel" });
};

export const addJSXChildToJSXElement = (parentElement: any, childElementTag: string, childShouldBeSelfClosing = false) => {
  parentElement.children.push(
    b.jsxElement(
      b.jsxOpeningElement(b.jsxIdentifier(childElementTag), [], childShouldBeSelfClosing),
      childShouldBeSelfClosing ? undefined: b.jsxClosingElement(b.jsxIdentifier(childElementTag))
    )
  );
  // if the parent was self closing, open it up
  if (parentElement.openingElement.selfClosing) {
    parentElement.closingElement = b.jsxClosingElement(
      b.jsxIdentifier(parentElement.openingElement.name.name)
    );
    parentElement.openingElement.selfClosing = false;
  }
}
