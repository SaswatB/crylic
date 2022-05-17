export interface RenderStarterDefinition {
  imports: string[];
  beforeRender: string[];
  render: {
    root: string;
    errorWrapper: string;
    wrappers: { open: string; close: string }[];
    componentProps: string[];
  };
  afterRender: string[];
}

export function generateRenderStarter(def: RenderStarterDefinition) {
  return `
${def.imports.join("\n")}

// before render

${def.beforeRender.join("\n\n")}

// render

ReactDOM.render((
  <${def.render.errorWrapper}>
    ${def.render.wrappers.reduceRight(
      (c, { open, close }) => `<${open}>${c}</${close}>`,
      `<Component ${def.render.componentProps?.join(" ") || ""} />`
    )}
  </${def.render.errorWrapper}>),
  document.getElementById("${def.render.root}")
);

// after render

${def.afterRender.join("\n\n")}

`.trim();
}
