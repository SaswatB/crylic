module.exports = {
  jsc: {
    parser: {
      syntax: "typescript",
      tsx: true,
      jsx: true,
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
};
