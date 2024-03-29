import { namedTypes as t } from "ast-types";
import { pipe } from "fp-ts/lib/pipeable";
import { CSSASTNode } from "gonzales-pe";
import { flatten, kebabCase } from "lodash";
import { types } from "recast";

import { CodeEntry } from "../../project/CodeEntry";
import { Project } from "../../project/Project";
import {
  createCSSPropertyDeclaration,
  CSSASTBuilder as cb,
  getValue,
  ifJSXExpressionContainer,
  ifJSXIdentifier,
  ifObjectExpression,
  parseAST,
  parseStyleSheetAST,
  prettyPrintCodeEntryAST,
  traverseJSXElements,
} from "../ast-helpers";
import { ActionProvider, EditorAction } from "./ActionProvider";

const { builders: b } = types;

const DISABLE_MOVE_STYLE_TO_STYLE_SHEET = true; // todo allow users to select style sheet

type JSXASTEditorAction = {
  type: "MoveStyleToStyleSheet";
  elementIndex: number;
};

export class JSXActionProvider extends ActionProvider<JSXASTEditorAction> {
  public getEditorActions(codeEntry: CodeEntry) {
    if (DISABLE_MOVE_STYLE_TO_STYLE_SHEET) return [];

    const ast = parseAST(codeEntry.code$.getValue() || "");
    const actions: EditorAction<JSXASTEditorAction>[] = [];
    traverseJSXElements(ast, (path, index) => {
      const styleAttr = path.node.openingElement.attributes?.find(
        (attribute) => {
          return (
            attribute.type === "JSXAttribute" &&
            attribute.name.name === "style" &&
            attribute.value?.type === "JSXExpressionContainer" &&
            attribute.value.expression.type === "ObjectExpression" &&
            attribute.value.expression.properties.every(
              (property) =>
                property.type === "ObjectProperty" &&
                property.key.type === "Identifier" &&
                property.value.type === "StringLiteral"
            )
          );
        }
      );
      if (styleAttr && styleAttr.loc) {
        actions.push({
          name: "Move style to style sheet",
          action: {
            type: "MoveStyleToStyleSheet",
            elementIndex: index,
          },
          codeId: codeEntry.id,
          line: styleAttr.loc.start.line,
          column: styleAttr.loc.start.column,
        });
      }
    });
    return actions;
  }

  public runEditorActionOnAST(
    action: EditorAction<JSXASTEditorAction>,
    project: Project
  ) {
    if (action.action.type === "MoveStyleToStyleSheet") {
      const codeEntry = project.getCodeEntryValue(action.codeId)!;
      const ast = parseAST(codeEntry.code$.getValue() || "");
      let styleClassName = "";
      let style: { name: string; value: string }[] = [];
      traverseJSXElements(ast, (path, index) => {
        if (index === action.action.elementIndex) {
          const styleAttr = path.node.openingElement.attributes?.find(
            (attribute): attribute is t.JSXAttribute => {
              return (
                attribute.type === "JSXAttribute" &&
                attribute.name.name === "style"
              );
            }
          );
          style =
            pipe(
              styleAttr,
              getValue,
              ifJSXExpressionContainer,
              (_) => _?.expression,
              ifObjectExpression,
              (_) => _?.properties
            )
              ?.map(
                (property) =>
                  property.type === "ObjectProperty" &&
                  property.key.type === "Identifier" &&
                  property.value.type === "StringLiteral" && {
                    name: kebabCase(property.key.name),
                    value: property.value.value,
                  }
              )
              .filter(
                (property): property is { name: string; value: string } =>
                  !!property
              ) || [];
          const elementName = pipe(
            path.node.openingElement.name,
            ifJSXIdentifier,
            (_) => _?.name
          );
          // todo allow the user to give the class name
          styleClassName = `st-${codeEntry.friendlyName.toLowerCase()}-${elementName}-${index}`;
          path.node.openingElement.attributes =
            path.node.openingElement.attributes?.filter(
              (attr) =>
                attr.type !== "JSXAttribute" || attr.name.name !== "style"
            );
          // todo merge with existing attribute
          path.node.openingElement.attributes?.push(
            b.jsxAttribute(
              b.jsxIdentifier("className"),
              b.stringLiteral(styleClassName)
            )
          );
        }
      });
      // todo allow the user to select a different style file
      const styleCodeEntry = project.codeEntries$
        .getValue()
        .find((e) => e.isStyleEntry)!;
      const styleAst = parseStyleSheetAST(styleCodeEntry.getRemoteCodeEntry());
      // todo merge this with addStyleGroupToAST
      (styleAst.content as CSSASTNode[]).push(
        cb.ruleset([
          cb.selector([cb.class([cb.ident(styleClassName)])]),
          cb.block(
            flatten(
              style.map(({ name, value }) =>
                // todo auto detect indentation in file
                createCSSPropertyDeclaration(name, value, "  ", styleAst.syntax)
              )
            )
          ),
        ])
      );

      return [
        {
          id: action.codeId,
          code: prettyPrintCodeEntryAST(
            project.config,
            codeEntry.getRemoteCodeEntry(),
            ast
          ),
        },
        {
          id: styleCodeEntry.id,
          code: prettyPrintCodeEntryAST(
            project.config,
            styleCodeEntry.getRemoteCodeEntry(),
            styleAst
          ),
        },
      ];
    }
    return [];
  }
}
