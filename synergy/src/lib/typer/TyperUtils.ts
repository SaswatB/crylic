import { pipe } from "fp-ts/lib/pipeable";
import ts from "typescript";

import libTypes from "../../vendor/ts-lib/lib.d.ts.txt";
import libDomTypes from "../../vendor/ts-lib/lib.dom.d.ts.txt";
import libEs5Types from "../../vendor/ts-lib/lib.es5.d.ts.txt";
import { LTBehaviorSubject } from "../lightObservable/LTBehaviorSubject";
import { CodeEntry, INITIAL_CODE_REVISION_ID } from "../project/CodeEntry";
import { PortablePath } from "../project/PortablePath";
import { TSTypeKind, TSTypeWrapper } from "./ts-type-wrapper";

function isObjectType(t: ts.Type): t is ts.ObjectType {
  return !!(t.flags & ts.TypeFlags.Object);
}

function isTypeReference(t: ts.ObjectType): t is ts.TypeReference {
  return !!(t.objectFlags & ts.ObjectFlags.Reference);
}

function visitJSX(
  node: ts.Node,
  visitor: (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => void
) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    visitor(node);
  }
  node.forEachChild((child) => visitJSX(child, visitor));
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
  // {
  //   path: "<project-path>/node_modules/@types/react/index.d.ts",
  //   code: reactTypes,
  // },
];

export class TyperUtils {
  protected services: ts.LanguageService;
  protected program: ts.Program;
  protected tc: ts.TypeChecker;

  public constructor(
    protected projectPath: PortablePath,
    public readonly codeEntries$: LTBehaviorSubject<CodeEntry[]>,
    tsHost: ts.System
  ) {
    const projectDefaultLibs = defaultLibs.map((lib) => ({
      ...lib,
      path: lib.path.replace("<project-path>", projectPath.getNormalizedPath()),
    }));

    // process tsconfig.json
    const configFileName = ts.findConfigFile(
      projectPath.getNativePath(),
      tsHost.fileExists,
      "tsconfig.json"
    );
    const tsConfig = configFileName
      ? ts.parseJsonConfigFileContent(
          ts.readConfigFile(configFileName, tsHost.readFile).config,
          tsHost,
          projectPath.getNativePath()
        ).options
      : undefined;

    const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => [
        ...codeEntries$.getValue().map((e) => e.filePath.getNativePath()),
        ...projectDefaultLibs.map((d) => d.path),
      ],
      getScriptVersion: (fileName) =>
        `${
          codeEntries$
            .getValue()
            .find((e) => e.filePath.getNativePath() === fileName)
            ?.codeRevisionId || INITIAL_CODE_REVISION_ID
        }`,
      getScriptSnapshot: (fileName) => {
        const defaultLib = projectDefaultLibs.find((d) => d.path === fileName);
        if (defaultLib) return ts.ScriptSnapshot.fromString(defaultLib.code);
        const code = codeEntries$
          .getValue()
          .find((e) => e.filePath.getNativePath() === fileName)
          ?.code$.getValue();
        return code
          ? ts.ScriptSnapshot.fromString(code)
          : ts.ScriptSnapshot.fromString(tsHost.readFile(fileName) || "");
      },

      getCurrentDirectory: () => projectPath.getNativePath(),
      getCompilationSettings: () => tsConfig || {},
      getDefaultLibFileName: () => projectDefaultLibs[0]!.path,
      fileExists: tsHost.fileExists,
      readFile: tsHost.readFile,
      readDirectory: tsHost.readDirectory,
      directoryExists: tsHost.directoryExists,
      getDirectories: tsHost.getDirectories,
    };

    this.services = ts.createLanguageService(
      servicesHost,
      ts.createDocumentRegistry()
    );
    this.program = this.services.getProgram()!;
    this.tc = this.program.getTypeChecker();
  }

  protected wrapType(
    t: ts.Type | undefined,
    depth = 1,
    childLimit = 100
  ): TSTypeWrapper {
    if (!t) return { kind: TSTypeKind.Unknown };
    if (depth > 10)
      return { kind: TSTypeKind.Unknown, omittedDueToDepth: true }; // avoid infinite recursion

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
    else if (isObjectType(t) || t.isIntersection())
      return this.wrapObjectType(t, depth + 1, childLimit);
    else if (t.isUnion()) {
      return {
        kind: TSTypeKind.Union,
        memberTypes: t.types.map((type) =>
          this.wrapType(type, depth + 1, childLimit)
        ),
      };
    }

    return { kind: TSTypeKind.Unknown };
  }

  protected wrapObjectType(
    t: ts.ObjectType | ts.IntersectionType,
    depth: number,
    childLimit: number
  ): TSTypeWrapper {
    if (!t || depth > 10) return { kind: TSTypeKind.Object, props: [] }; // avoid infinite recursion

    if (t.getCallSignatures().length > 0) return { kind: TSTypeKind.Function };
    else if (
      !t.isIntersection() &&
      isTypeReference(t) &&
      t.symbol?.escapedName === "Array"
    ) {
      return {
        kind: TSTypeKind.Array,
        memberType: this.wrapType(
          this.tc.getTypeArguments(t)[0],
          depth + 1,
          childLimit
        ),
      };
    } else if (
      !t.isIntersection() &&
      isTypeReference(t) &&
      t.target.objectFlags & ts.ObjectFlags.Tuple
    ) {
      return {
        kind: TSTypeKind.Tuple,
        memberTypes: isTypeReference(t)
          ? this.tc
              .getTypeArguments(t)
              .map((type) => this.wrapType(type, depth + 1, childLimit))
          : [],
      };
    }

    const props = t.getProperties();
    if (props.length > 0) {
      return {
        kind: TSTypeKind.Object,
        props: props.map((prop, index) => {
          const declaration =
            prop.declarations?.[0] || t.getSymbol()?.declarations?.[0];
          return {
            name: prop.escapedName as string,
            type: this.wrapType(
              declaration
                ? this.tc.getTypeOfSymbolAtLocation(prop, declaration)
                : undefined,
              index > childLimit ? 9999 : depth + 1,
              childLimit / 2
            ),
            optional: !!(prop.getFlags() & ts.SymbolFlags.Optional),
          };
        }),
      };
    } else if (!t.isIntersection() && isTypeReference(t)) {
      return this.wrapType(t.target, depth + 1, childLimit);
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

  /**
   * Given a source file & a position of a JSX element, this returns the prop type for the element's component
   */
  public getComponentPropsAtPosition(sourcePath: string, position: number) {
    const source = this.program.getSourceFile(sourcePath)!;

    let jsxElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined;
    visitJSX(source, (node) => {
      if (node.pos <= position && position <= node.end) jsxElement = node;
    });
    if (!jsxElement) return undefined;

    const propType = this.tc.getContextualType(jsxElement.attributes);
    const wrappedType = propType && this.wrapType(propType);
    if (wrappedType?.kind !== TSTypeKind.Object) return undefined;

    // strip out the props that are not relevant
    // todo should children stay if it's not a ReactNode?
    wrappedType.props = wrappedType.props.filter(
      (p) => !["key", "ref", "children"].includes(p.name)
    );
    return wrappedType;
  }
}
