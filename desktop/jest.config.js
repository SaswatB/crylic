module.exports = {
  roots: ["<rootDir>/test"],
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  setupFiles: ["react-app-polyfill/jsdom", "<rootDir>/test/lib/setupTests.js"],
  setupFilesAfterEnv: [],
  testEnvironment: "jest-environment-jsdom",
  testRegex: ".*(test|spec)\\.tsx?$",
  transform: {
    "^.+\\.fixture\\..+$": "jest-raw-loader",
    "^.+\\.(t|j)sx?$": [
      // use babel instead of swc here for much better debugging (ex: working & accurate breakpoints)
      "babel-jest",
      {
        presets: [
          "@babel/preset-typescript",
          ["@babel/preset-env", { targets: { node: 16 } }],
        ],
      },
    ],
    "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)":
      "<rootDir>/config/jest/fileTransform.js",
  },
  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\]prettier"],
  modulePaths: [],
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^!!.*binaryLoader!.*": "jest-raw-loader",
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
