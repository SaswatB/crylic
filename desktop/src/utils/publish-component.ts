import cors from "cors";

const crypto = __non_webpack_require__("crypto") as typeof import("crypto");
const express = __non_webpack_require__("express") as typeof import("express");

// todo set a better title, use code meta data to better choose component from exports
const getHTMLPage = (bundle: string) => `
<html>
  <head>
    <title>Crylic Publish</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css" />

    <script crossorigin src="https://unpkg.com/react@16/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.development.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-router-dom/5.2.0/react-router-dom.js"></script>
    <script>${bundle}</script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>

    <script>
      let bootstrapElement =
        Object.values(paintbundle.bootstrap || {}).find(
          (e) => typeof e === "function"
        );
      let compiledElement =
        Object.values(paintbundle.component).find(
          (e) => typeof e === "function"
        );
      
      let element = React.createElement(compiledElement);
      if (bootstrapElement) {
        element = React.createElement(bootstrapElement, {}, element);
      }

      ReactDOM.render(element, document.getElementById("root"));
    </script>
  </body>
</html>
`;

const bundleMap: Record<string, string | undefined> = {};
let publishServer: ReturnType<typeof import("express")> | undefined;
let publicSecurityToken: string;
let publishPort = 0;
const initPublishServer = () => {
  if (publishServer) return Promise.resolve();

  return new Promise((resolve) => {
    publicSecurityToken = crypto
      .randomBytes(32)
      .toString("base64")
      .replace(/[+/=]/g, "");

    publishServer = express();
    publishServer.use(cors());

    // todo see if anything needs to be done for react router on this route
    publishServer.get(`/publish/${publicSecurityToken}/:codeId`, (req, res) => {
      console.log("bundle request at", req.params.codeId);
      const bundle = bundleMap[req.params.codeId];
      if (!bundle) {
        return res.status(404).send();
      }

      res.set("Content-Type", "text/html");
      return res.send(getHTMLPage(bundle));
    });
    const serverInstance = publishServer.listen(
      publishPort,
      "localhost",
      () => {
        publishPort = (serverInstance.address() as { port: number }).port;
        console.log("Publish server is running...", publishPort);
        resolve();
      }
    );
  });
};

export const publishComponent = async (codeId: string, bundle: string) => {
  await initPublishServer();
  bundleMap[codeId] = bundle;
  // todo use this as the public url in the bundle
  return `http://localhost:${publishPort}/publish/${publicSecurityToken}/${codeId}`;
};

export const unpublishComponent = async (codeId: string) => {
  bundleMap[codeId] = undefined;
};
