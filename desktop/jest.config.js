module.exports = {
  roots: ["<rootDir>/test"],
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  setupFiles: ["react-app-polyfill/jsdom", "<rootDir>/test/lib/setupTests.js"],
  setupFilesAfterEnv: [],
  testEnvironment: "jest-environment-jsdom",
  testRegex: ".*(test|spec)\\.tsx?$",
  transform: {
    "^.+\\.fixture\\..+$": "<rootDir>/config/jest/rawTransform.js",
    ".txt$": "<rootDir>/config/jest/rawTransform.js",
    "^.+\\.(t|j)sx?$": ["@swc/jest", require("./swc.config")],
    "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)":
      "<rootDir>/config/jest/fileTransform.js",
  },
  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\]prettier"],
  modulePaths: [],
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^!!.*binaryLoader!.*": "<rootDir>/config/jest/rawTransform.js",
  },
  moduleFileExtensions: [
    "web.js",
    "js",
    "web.ts",
    "ts",
    "web.tsx",
    "tsx",
    "json",
    "web.jsx",
    "jsx",
    "node",
  ],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
};
