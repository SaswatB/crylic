# Build System

Crylic comes bundled with the following technologies:

<!-- lm_a95a542d63 electron (node) version -->
* Node v16
* NPM v6.14
* Yarn v1
* Webpack v4
* SWC & Babel v7
* React v17
* React Refresh

{% hint style="info" %}
Bundling these dependencies within Crylic allows anyone to get started without needing to setup a dev environment.
{% endhint %}

When opening a new component, Crylic will run it's built-in build system with the above technologies. By default this build system is compatible with `react-scripts` (projects created using `create-react-app`).

### Customizing Webpack

Crylic's in-built Webpack based build system can be fully customized.

An live config editor can be viewed by going to `Settings ⚙️ -> Edit Webpack Config`

![Webpack Configuration editor without an override file](<../.gitbook/assets/image (1).png>)

By default this editor requires creating a new [config ](../reference/configuration-file.md)with a reference to a new JavaScript file that will be used to store any overrides.

After creating the Webpack override file, the Webpack config editor will allow editing the Webpack config through a function that modifies the configuration object.

![Example Webpack override](../.gitbook/assets/image.png)

### Build System Overrides

In addition to the ability to arbitrarily change the Webpack config, there are several configuration options available in the [config ](../reference/configuration-file.md)file.

{% content-ref url="broken-reference" %}
[Broken link](broken-reference)
{% endcontent-ref %}

