# Configuration File

Crylic can be configured through a `crylic.config.js` file at the root of the project folder.

Config type:

```typescript
type ProjectConfigFile = {
    bootstrap?: string;
    sourceFolder?: string;
    webpack?: {
        overrideConfig?: {
            path?: string;
            disableExternalsInjection?: boolean;
            disableFastRefresh?: boolean;
            disableSWC?: boolean;
        };
    };
    prettier?: {
        enabled: boolean;
    };
    htmlTemplate?: {
        path: string;
        rootSelector?: string;
    };
    analyzer?: {
        allowLowerCaseComponentFiles?: boolean;
        allowTestComponentFiles?: boolean;
        allowDeclarationComponentFiles?: boolean;
        disableComponentExportsGuard?: boolean;
        forceUseComponentDefaultExports?: boolean;
        maxFileSizeBytes?: number;
    };
    packageManager?: {
        type?: "inbuilt" | "inbuilt-npm" | "inbuilt-yarn";
    };
}
```

Example config:

{% code title="crylic.config.js" %}
```javascript
module.exports = {
  bootstrap: 'src/bootstrap.tsx',
}
```
{% endcode %}

## Definitions

<details>

<summary>bootstrap?: string</summary>

_Default: undefined_

Defines a path to the [bootstrap file](../onboarding/bootstrap-file.md) for the project, relative to the project root. A bootstrap file defines a React component that encapsulates the component rendered by a frame, allowing providers, and similar constructs, to be setup within each frame.

</details>

<details>

<summary>sourceFolder?: string</summary>

_Default: "src/"_

Defines the root folder for all source files, relative to the project root. Currently only one source folder is supported.

</details>

### Webpack

Additional guidance for Webpack can be found under [Build System](../onboarding/build-system.md).

<details>

<summary>webpack.overrideConfig.path?: string</summary>

_Default: undefined_

Defines a path to the [Webpack override file](../onboarding/build-system.md#customizing-webpack) for the project, relative to the project root. The Webpack override file defines a function that overrides the active Webpack config.

</details>

<details>

<summary>webpack.overrideConfig.disableExternalsInjection?: boolean</summary>

_Default: false_

By default Crylic will inject packaged versions of some NPM packages, such as React & React Refresh, which allows new projects to be worked on without installing dependencies.

If this is causing issues, this feature can be disabled, but be sure to either add React Refresh to the project dependencies or set `webpack.overrideConfig.disableFastRefresh` to `true`.

</details>

<details>

<summary>webpack.overrideConfig.disableFastRefresh?: boolean</summary>

_Default: false_

Disables React Fast Refresh, which may improve stability of making changes but will slow down the speed at which changes will be reflected in a frame.

</details>

<details>

<summary>webpack.overrideConfig.disableSWC?: boolean</summary>

_Default: false_

Replaces SWC loader in the Webpack config with an equivalent Babel config. SWC is much faster than Babel at transpilation so this option is not recommended.

</details>

### Prettier

Crylic comes bundled with Prettier v2.1.1 for formatting code.

<details>

<summary>prettier.enabled: boolean</summary>

_Default: Enabled if Prettier is installed within package.json_

Enables Prettier formatting of edited code.

</details>

### Html Template

<details>

<summary>htmlTemplate.path?: string</summary>

_Default: "public/index.html"_

Defines a path to the HTML template file for the project, relative to the project root.

</details>

<details>

<summary>htmlTemplate.rootSelector?: string</summary>

_Default: "root"_

Defines the root element selector used to reference the element within the HTML template that ReactDOM will render to.

</details>

### Analyzer

Additional information about the analyzer can be found under [Analyzer Overrides](../onboarding/analyzer-overrides.md).

<details>

<summary>analyzer.allowLowerCaseComponentFiles?: boolean</summary>

_Default: false_

Allows files that start with a lower case letter to be considered as component files.

</details>

<details>

<summary>analyzer.allowTestComponentFiles?: boolean</summary>

_Default: false_

Allows test files (files with `.test.` in the name) to be considered as component files.

</details>

<details>

<summary>analyzer.allowDeclarationComponentFiles?: boolean</summary>

_Default: false_

Allows declaration files (files that end with `.d.ts`) to be considered as component files.

</details>

<details>

<summary>analyzer.disableComponentExportsGuard?: boolean</summary>

_Default: false_

Forces a fallback default export to be used if the static analysis engine fails to pick up a component in a source file.

</details>

<details>

<summary>analyzer.forceUseComponentDefaultExports?: boolean</summary>

_Default: false_

Forces components to always use default exports instead of relying on the static analysis engine to pick to most likely component export.

</details>

<details>

<summary>analyzer.maxFileSizeBytes?: number</summary>

_Default: 50kb_

Specifies the largest file size that will be processed by the static analysis engine.

</details>

### Package Manager

<details>

<summary>packageManager.type: "inbuilt" | "inbuilt-npm" | "inbuilt-yarn"</summary>

_Default: "inbuilt"_

Configures which package manager is used to install deps.

* `inbuilt` - auto selects `inbuilt-yarn` if a `yarn.lock` file is present in the project root, otherwise defaults to `inbuilt-npm`
* `inbuilt-npm` - runs a packaged version of npm
* `inbuilt-yarn` - runs a packaged version of yarn

</details>
