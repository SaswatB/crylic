// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 800, height: 400 });

function extractColor(str: string): SolidPaint {
  let color: RGB = { r: 0, g: 0, b: 0 };
  let opacity: number = 0;

  const arr = /^rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?(\d+\.?\d+?))?\)$/.exec(str);
  if (arr) {
    color = {
      r: parseInt(arr[1]!) / 255,
      g: parseInt(arr[2]!) / 255,
      b: parseInt(arr[3]!) / 255,
    };
    opacity = parseFloat(arr[4] || "1");
  }

  return {
    type: "SOLID",
    color,
    opacity,
  };
}

function getFont(
  fonts: Font[],
  fontFamily?: string,
  fontWeight?: string
): FontName {
  // resolve family
  let family = fontFamily?.split(",")[0]?.trim();
  if (family === "sans-serif") family = "Open Sans";
  if (!family || !fonts.find((f) => f.fontName.family === family)) {
    family = "Inter";
  }

  const availableFonts = fonts.filter((f) => f.fontName.family === family);

  // resolve weight
  let weight = parseInt(fontWeight || "400");
  let style = "Regular";

  if (weight >= 500) {
    const options = [
      { style: "ExtraBold", weight: 800 },
      { style: "Bold", weight: 700 },
      { style: "SemiBold", weight: 600 },
      { style: "Medium", weight: 500 },
    ]
      .filter((o) => availableFonts.find((f) => f.fontName.style === o.style))
      .map((o) => ({ ...o, weight: Math.abs(weight - o.weight) }))
      .sort((a, b) => a.weight - b.weight);
    if (options.length >= 1) style = options[0]!.style;
  } else if (100 <= weight && weight <= 300) {
    const options = [
      { style: "Light", weight: 300 },
      { style: "Extra Light", weight: 200 },
      { style: "Thin", weight: 100 },
    ]
      .filter((o) => availableFonts.find((f) => f.fontName.style === o.style))
      .map((o) => ({ ...o, weight: Math.abs(weight - o.weight) }))
      .sort((a, b) => a.weight - b.weight);
    if (options.length >= 1) style = options[0]!.style;
  }

  return { family, style };
}

// lm_e5c40550c3 copied interface
interface ExportedOutline {
  type: string;
  name: string;
  children: ExportedOutline[];
  textContent?: string; // type: "text"
  styles?: { [key: string]: string }; // type: "container"
}

async function createFigma(node: ExportedOutline, context: { fonts: Font[] }) {
  if (node.type === "text") {
    const text = figma.createText();
    text.x = parseFloat(node.styles?.left || "0");
    text.y = parseFloat(node.styles?.top || "0");
    const font = getFont(
      context.fonts,
      node.styles?.fontFamily,
      node.styles?.fontWeight
    );
    await figma
      .loadFontAsync(font)
      .then(() => {
        text.fontName = font;
      })
      .catch((err) => console.error(err));
    text.fills = [extractColor(node.styles?.color || "")];
    text.fontSize = parseFloat(node.styles?.fontSize || "12");
    text.characters = node.textContent || "";
    return text;
  }

  const frame = figma.createFrame();
  frame.name = node.name;
  frame.clipsContent = node.styles?.clip === "true";
  // offset
  frame.x = parseFloat(node.styles?.left || "0");
  frame.y = parseFloat(node.styles?.top || "0");
  // size
  frame.resize(
    parseFloat(node.styles?.width || "100"),
    parseFloat(node.styles?.height || "100")
  );
  // fill
  if (node.styles?.backgroundColor)
    frame.fills = [extractColor(node.styles.backgroundColor)];
  // border
  // todo support border on each side instead of over the whole frame

  if (node.styles?.borderBottomWidth) {
    frame.strokeWeight = parseInt(node.styles.borderBottomWidth);

    if (node.styles?.borderBottomColor)
      frame.strokes = [extractColor(node.styles.borderBottomColor)];
  }

  if (node.styles?.borderTopLeftRadius)
    frame.topLeftRadius = parseInt(node.styles.borderTopLeftRadius);
  if (node.styles?.borderTopRightRadius)
    frame.topRightRadius = parseInt(node.styles.borderTopRightRadius);
  if (node.styles?.borderBottomLeftRadius)
    frame.bottomLeftRadius = parseInt(node.styles.borderBottomLeftRadius);
  if (node.styles?.borderBottomRightRadius)
    frame.bottomRightRadius = parseInt(node.styles.borderBottomRightRadius);

  const childrenFigma = await Promise.all(
    node.children.map((c) => createFigma(c, context))
  );
  childrenFigma.forEach((c) => frame.appendChild(c));

  return frame;
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  if (msg.type === "create-component") {
    let node: ExportedOutline;
    try {
      node = JSON.parse(msg.input);
    } catch (e) {
      console.error(e);
      figma.ui.postMessage({
        type: "error",
        message: "Failed to import, invalid component",
      });
      return;
    }

    const fonts = await figma.listAvailableFontsAsync();
    // default font
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    const comp = await createFigma(node, { fonts });
    figma.currentPage.appendChild(comp);
    figma.currentPage.selection = [comp];
    figma.viewport.scrollAndZoomIntoView([comp]);
  }

  figma.closePlugin();
};
