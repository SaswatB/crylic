# Component Library

A popular pattern in web development is to have a set of well-defined components that can be used throughout the website. Crylic is well suited to creating, editing, and styling such components.

{% hint style="success" %}
Crylic is currently limited to basic style and component editing. Additional capabilities, such as creating variants and supporting more frameworks, will be added over time. Let us know what features you'd like to see at [info@crylic.io](mailto:info@crylic.io) or within the in-app feedback form!
{% endhint %}

This guide will go over how to create a components library utilizing Crylic's `styled-components` integration.

### Adding new components

After opening a project, a button to create new components will be available next to the assets pane.

![Add component button highlighted](<../.gitbook/assets/image (16).png>)

Click this button to open a dialog box that can configure the new component. There are multiple presets available, which can all be used for a component library, as this guide focuses on `styled-components` use `Basic with Styled Component`.

![Component creation dialog](<../.gitbook/assets/image (3).png>)

The new component is now available. This component can be styled (covered in the [Editing components section](component-library.md#editing-components)) and added to other components (covered in the [Composing components section](component-library.md#composing-components)).

### Editing components

To edit components, they need to be rendered onto the main workspace using the render button within the assets pane. New components are automatically added to the main workspace when they are created.

![Render component button highlighted](<../.gitbook/assets/image (2).png>)

After adding the component to the workspace, it can be edited. The outline pane displays all the elements of the component that are currently visible. These elements can be selected by clicking on the outline pane or with the `Select Element` tool. A new `styled-component` has a `Container` element by default.

{% hint style="info" %}
For this guide, element refers to a part of a component. An element can be a different component.
{% endhint %}

![The container element of a new component selected](<../.gitbook/assets/image (15).png>)

After selecting an element, a right pane is shown with editors that can change the style of the selected element. Try changing the height or fill!

Additional elements can be added to the component through the `Add Element` tool.

![The add element menu](<../.gitbook/assets/image (6).png>)

Crylic supports multiple component libraries out of the box. To continue with `styled-components`, select the Styled Components library. Then, use any of the provided components to build on the new component. Try adding a heading!

New elements can be added by clicking on an existing element within the workspace or the outline pane.

![A heading added to the new component](<../.gitbook/assets/image (7) (1).png>)

Elements can also be reordered by dragging them in the outline pane.

![A text element getting dragged above the heading element](../.gitbook/assets/image.png)

Finally, elements can also be deleted with the `Delete` key or the Delete Element button within the element editor.

![The delete element button highlighted](<../.gitbook/assets/image (5).png>)

### Composing components

Crylic supports composing components together within the editor, utilizing the add element button within the assets pane.

![The add element action within the assets pane highlighted](<../.gitbook/assets/image (4).png>)

This button works the same as the add element tool but allows you to compose your own components easily!

![A custom button added from the existing component library to the new component](<../.gitbook/assets/image (8) (1).png>)

{% hint style="info" %}
Does that button look familiar? It's because the project open in the screenshot is Crylic's own component library! Crylic is able to contribute to itself 🚀
{% endhint %}
