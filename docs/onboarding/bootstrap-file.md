# Bootstrap File

Crylic provides the ability to wrap rendered components in a separately defined wrapper component. This is useful for specifying providers that components may depend on, such as Redux Providers or React Contexts.

Bootstrap components are expected take a children property, and render that property.

Example bootstrap file:

```typescript
import React from 'react'
import Providers from './Providers'

export const Bootstrap = ({ children }) => (
  <React.StrictMode>
    <Providers>
        {children}
    </Providers>
  </React.StrictMode>
);
```

Crylic can be configured to use a bootstrap file in the [config file](../reference/configuration-file.md).
