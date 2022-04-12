// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 800, height: 400 });

// figma.ui.postMessage()

function recurse(node: SceneNode) {
  console.log("node", node.type, JSON.stringify(node));
  if ("children" in node) node.children.forEach(recurse);
}

figma.currentPage.selection.forEach(recurse);

function extractColor(str: string): SolidPaint {
  let color: RGB = { r: 0, g: 0, b: 0 };
  let opacity: number = 0;

  const arr = /^rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?(\d+))?\)$/.exec(str);
  if (arr) {
    color = {
      r: parseInt(arr[1]!) / 255,
      g: parseInt(arr[2]!) / 255,
      b: parseInt(arr[3]!) / 255,
    };
    opacity = parseInt(arr[4] || "1");
  }

  return {
    type: "SOLID",
    color,
    opacity,
  };
}

interface ExportedOutline {
  type: string;
  name: string;
  children: ExportedOutline[];
  textContent?: string; // type: "text"
  styles?: { [key: string]: string }; // type: "container"
}

async function createFigma(node: ExportedOutline) {
  if (node.type === "text") {
    const text = figma.createText();
    const font = {
      family: node.styles?.fontFamily || "Arial",
      style: "Regular",
    };
    await figma
      .loadFontAsync(font)
      .then(() => {
        text.fontName = font;
      })
      .catch((err) => console.error(err));
    text.fills = [extractColor(node.styles?.color || "")];
    text.characters = node.textContent || "";
    return text;
  }
  const frame = figma.createFrame();
  frame.x = parseInt(node.styles?.offsetLeft || "0");
  frame.y = parseInt(node.styles?.offsetTop || "0");
  frame.resize(
    parseInt(node.styles?.width || "100"),
    parseInt(node.styles?.height || "100")
  );
  frame.fills = [extractColor(node.styles?.backgroundColor || "")];
  await Promise.all(
    node.children.map(async (c) => frame.appendChild(await createFigma(c)))
  );
  return frame;
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === "create-component") {
    let node: ExportedOutline;
    try {
      node = JSON.parse(msg.input);
    } catch (e) {
      console.error(e);
      // todo display error
      return;
    }

    // default font
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    const comp = await createFigma(node);
    figma.currentPage.appendChild(comp);
    figma.currentPage.selection = [comp];
    figma.viewport.scrollAndZoomIntoView([comp]);
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
