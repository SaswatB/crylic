const theme = {};
// https://github.com/microsoft/vscode/tree/master/extensions/theme-defaults/themes
// https://microsoft.github.io/monaco-editor/playground.html#customizing-the-appearence-tokens-and-colors
// https://github.com/microsoft/TypeScript-TmLanguage/blob/master/TypeScriptReact.tmTheme
// https://github.com/codesandbox/codesandbox-client/pull/647/commits/a34381253a248c192c86d1204bc3125383c2e376
// https://github.com/Microsoft/monaco-editor/issues/264
console.log(
  JSON.stringify(
    [].concat(
      ...theme.tokenColors.map((c) => {
        let tokens;
        if (typeof c.scope === "string") {
          tokens = c.scope.split(",");
        } else {
          tokens = c.scope;
        }
        return tokens.map((token) => ({
          token,
          ...c.settings,
        }));
      })
    ),
    null,
    4
  )
);
