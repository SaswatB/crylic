import { pipe } from "fp-ts/lib/pipeable";
import ts from "typescript";

import { RemoteCodeEntry } from "../project/CodeEntry";

export class TyperUtils {
  protected services: ts.LanguageService;
  protected program: ts.Program;
  protected tc: ts.TypeChecker;

  public constructor(
    protected projectDir: string,
    protected codeEntries: RemoteCodeEntry[]
  ) {
    const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => codeEntries.map((e) => e.filePath),
      getScriptVersion: (fileName) =>
        `${
          this.codeEntries.find((e) => e.filePath === fileName)
            ?.codeRevisionId || 0
        }`,
      getScriptSnapshot: (fileName) =>
        pipe(this.codeEntries.find((e) => e.filePath === fileName)?.code, (_) =>
          _ ? ts.ScriptSnapshot.fromString(_) : undefined
        ),
      getCurrentDirectory: () => projectDir,
      getCompilationSettings: () => ({ jsx: ts.JsxEmit.React }),
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
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
    const props = pipe(
      declaration,
      (_) => _ && resolveFunctionDeclaration(_),
      (_) => _ && this.tc.getSignatureFromDeclaration(_),
      (_) => _?.getParameters()[0]?.getDeclarations()?.[0],
      (_) => _ && this.tc.getTypeAtLocation(_),
      (_) => _ && this.tc.getPropertiesOfType(_)
    );

    return props?.map((prop) => ({
      prop: prop.escapedName,
      type: pipe(
        this.tc.getTypeOfSymbolAtLocation(prop, declaration!),
        (_) =>
          Object.entries(ts.TypeFlags).find(
            ([_k, v]) => typeof v === "number" && _.getFlags() & v
          )?.[0]
      ),
      optional: !!(prop.getFlags() & ts.SymbolFlags.Optional),
    }));
  }
}
