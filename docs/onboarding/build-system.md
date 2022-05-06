# Build System

Crylic comes bundled with the following technologies:

* Node v16
* NPM v6.14
* Yarn v1
* Webpack v5
* SWC & Babel v7
* React v17
* React Refresh

{% hint style="info" %}
Bundling these dependencies within Crylic allows anyone to get started without needing to set up a dev environment.
{% endhint %}

Crylic will run its built-in build system with the above technologies when opening a new component. By default, this build system is compatible with `react-scripts` (projects created using `create-react-app`).

### Customizing Webpack

Crylic's in-built Webpack based build system can be fully customized to match existing configs.

A live config editor can be viewed by going to `Settings ⚙️ -> Edit Webpack Config`

![Webpack Configuration editor without an override file](<../.gitbook/assets/image (1) (1) (1) (1).png>)

By default, this editor requires creating a new [config ](../reference/configuration-file.md)with a reference to a new JavaScript file to store any overrides.

After creating the Webpack override file, the Webpack config editor will allow editing the Webpack config through a function that modifies the configuration object.

![Example Webpack override](<../.gitbook/assets/image (1) (1) (1).png>)

### Build System Overrides

In addition to the ability to arbitrarily change the Webpack config, several configuration options are available in the [config ](../reference/configuration-file.md)file, which provide some common modifications.

{% content-ref url="../reference/configuration-file.md#webpack" %}
[#webpack](../reference/configuration-file.md#webpack)
{% endcontent-ref %}

### Crylic specific code

By default, the following variable is exposed through the Webpack config's DefinePlugin: `__IS_CRYLIC__`. This allows writing code that only gets executed when Crylic is rendering the page, such as mock data. To properly remove such code in non-Crylic builds, the following should be defined in the project's main bundler: `__IS_CRYLIC__: JSON.stringify(false)`
