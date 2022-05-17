import { pipe } from "fp-ts/lib/pipeable";
import ts from "typescript";

import reactTypes from "../../vendor/react-types.ts.txt";
import libTypes from "../../vendor/ts-lib/lib.d.ts.txt";
import libDomTypes from "../../vendor/ts-lib/lib.dom.d.ts.txt";
import libEs5Types from "../../vendor/ts-lib/lib.es5.d.ts.txt";
import { normalizePath } from "../normalizePath";
import {
  INITIAL_CODE_REVISION_ID,
  RemoteCodeEntry,
} from "../project/CodeEntry";
import { TSTypeKind, TSTypeWrapper } from "./ts-type-wrapper";

function isObjectType(t: ts.Type): t is ts.ObjectType {
  return !!(t.flags & ts.TypeFlags.Object);
}

function isTypeReference(t: ts.ObjectType): t is ts.TypeReference {
  return !!(t.objectFlags & ts.ObjectFlags.Reference);
}

const defaultLibs = [
  {
    path: "/lib.d.ts",
    code: libTypes,
  },
  {
    path: "/lib.dom.ts",
    code: libDomTypes,
  },
  {
    path: "/lib.es5.ts",
    code: libEs5Types,
  },
  {
    path: "<project-path>/node_modules/@types/react/index.d.ts",
    code: reactTypes,
  },
];

export class TyperUtils {
  protected services: ts.LanguageService;
  protected program: ts.Program;
  protected tc: ts.TypeChecker;

  public constructor(
    protected projectDir: string,
    protected codeEntries: RemoteCodeEntry[]
  ) {
    const projectDefaultLibs = defaultLibs.map((lib) => ({
      ...lib,
      path: lib.path.replace("<project-path>", normalizePath(projectDir, "/")),
    }));

    const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => [
        ...codeEntries.map((e) => e.filePath),
        ...projectDefaultLibs.map((d) => d.path),
      ],
      getScriptVersion: (fileName) =>
        `${
          this.codeEntries.find((e) => e.filePath === fileName)
            ?.codeRevisionId || INITIAL_CODE_REVISION_ID
        }`,
      getScriptSnapshot: (fileName) => {
        const defaultLib = projectDefaultLibs.find((d) => d.path === fileName);
        if (defaultLib) return ts.ScriptSnapshot.fromString(defaultLib.code);

        const code = this.codeEntries.find(
          (e) => e.filePath === fileName
        )?.code;
        return code ? ts.ScriptSnapshot.fromString(code) : undefined;
      },
      getCurrentDirectory: () => projectDir,
      getCompilationSettings: () => ({
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      }),
      getDefaultLibFileName: () => projectDefaultLibs[0]!.path,
    };

    this.services = ts.createLanguageService(
      servicesHost,
      ts.createDocumentRegistry()
    );
    this.program = this.services.getProgram()!;
    this.tc = this.program.getTypeChecker();
  }

  public updateCodeEntries(deltaCodeEntries: RemoteCodeEntry[]) {
    // this currently doesn't support deletes
    deltaCodeEntries.forEach((newEntry) => {
      const existingEntryIndex = this.codeEntries.findIndex(
        (e) => e.filePath === newEntry.filePath
      );
      if (existingEntryIndex !== -1)
        this.codeEntries[existingEntryIndex] = newEntry;
      else this.codeEntries.push(newEntry);
    });
  }

  protected wrapType(t: ts.Type, depth = 1): TSTypeWrapper {
    if (!t || depth > 100) return { kind: TSTypeKind.Unknown }; // avoid infinite recursion

    if (t.flags & ts.TypeFlags.StringLike) {
      // todo support template string
      if (t.isStringLiteral())
        return { kind: TSTypeKind.LiteralString, value: t.value };
      return { kind: TSTypeKind.String };
    } else if (t.flags & ts.TypeFlags.NumberLike) {
      if (t.isNumberLiteral())
        return { kind: TSTypeKind.LiteralNumber, value: t.value };
      return { kind: TSTypeKind.Number };
    } else if (t.flags & ts.TypeFlags.BooleanLike)
      return { kind: TSTypeKind.Boolean };
    else if (t.flags & ts.TypeFlags.VoidLike)
      return { kind: TSTypeKind.Undefined };
    else if (t.flags & ts.TypeFlags.Null) return { kind: TSTypeKind.Null };
    else if (isObjectType(t)) return this.wrapObjectType(t, depth + 1);
    else if (t.isUnion())
      // todo handle intersection?
      return {
        kind: TSTypeKind.Union,
        memberTypes: t.types.map((type) => this.wrapType(type)),
      };

    return { kind: TSTypeKind.Unknown };
  }

  protected wrapObjectType(t: ts.ObjectType, depth = 1): TSTypeWrapper {
    if (!t || depth > 100) return { kind: TSTypeKind.Object, props: [] }; // avoid infinite recursion

    if (t.getCallSignatures().length > 0) return { kind: TSTypeKind.Function };
    else if (
      t.objectFlags &
      (ts.ObjectFlags.ClassOrInterface | ts.ObjectFlags.Anonymous)
    ) {
      return {
        kind: TSTypeKind.Object,
        props: t.getProperties().map((prop) => ({
          name: prop.escapedName as string,
          type: this.wrapType(
            this.tc.getTypeOfSymbolAtLocation(
              prop,
              t.getSymbol()?.declarations?.[0]!
            ),
            depth + 1
          ),
          optional: !!(prop.getFlags() & ts.SymbolFlags.Optional),
        })),
      };
    } else if (isTypeReference(t)) {
      if (t.symbol?.escapedName === "Array") {
        return {
          kind: TSTypeKind.Array,
          memberType: this.wrapType(
            this.tc.getTypeArguments(t)![0]!,
            depth + 1
          ),
        };
      } else if (t.target.objectFlags & ts.ObjectFlags.Tuple) {
        return {
          kind: TSTypeKind.Tuple,
          memberTypes: isTypeReference(t)
            ? this.tc
                .getTypeArguments(t)
                .map((type) => this.wrapType(type, depth + 1))
            : [],
        };
      }

      return this.wrapType(t.target, depth + 1);
    }

    return { kind: TSTypeKind.Object, props: [] };
  }

  /**
   * Given a source file & an exported component name, this returns the prop type for the component
   */
  public getExportedComponentProps(
    sourcePath: string,
    exportTarget: { name: string | undefined; isDefault: boolean }
  ) {
    const source = this.program.getSourceFile(sourcePath)!;
    const exports = pipe(
      source,
      (_) => this.tc.getSymbolAtLocation(_),
      (_) => _ && this.tc.getExportsOfModule(_)
    );
    const declaration = exports?.find(
      (e) =>
        e.name === exportTarget.name ||
        (exportTarget.isDefault && e.name === "default")
    )?.declarations?.[0];

    const resolveFunctionDeclaration = (
      node: ts.Node
    ): ts.SignatureDeclaration | undefined => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      )
        return node;
      else if (ts.isExportAssignment(node))
        return resolveFunctionDeclaration(node.expression);
      else if (ts.isExportSpecifier(node))
        return resolveFunctionDeclaration(node.name);
      else if (ts.isVariableDeclaration(node) && node.initializer)
        return resolveFunctionDeclaration(node.initializer);
      else if (ts.isIdentifier(node)) {
        // follow identifiers to their declarations
        const d = this.tc
          .getTypeAtLocation(node)
          .getSymbol()
          ?.getDeclarations()?.[0];
        return d && resolveFunctionDeclaration(d);
      }

      return undefined;
    };

    // todo support HoCs?
    const propType = pipe(
      declaration,
      (_) => _ && resolveFunctionDeclaration(_),
      (_) => _ && this.tc.getSignatureFromDeclaration(_),
      (_) => _?.getParameters()[0]?.getDeclarations()?.[0],
      (_) => _ && this.tc.getTypeAtLocation(_)
    );

    return propType && this.wrapType(propType);
  }
}
