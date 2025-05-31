import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import babelParser from "@babel/eslint-parser";

export default [
  {
    files: ["**/*.js", "**/*.jsx"], // Include all .js and .jsx files
    ignores: ["node_modules/**"], // Ignore node_modules
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 2021, // Use ECMAScript 2021
        sourceType: "module", // Enable ES modules
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
        requireConfigFile: false, // Allow ESLint to run without requiring a Babel config file
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off", // Not needed for React 17+
      "react-hooks/rules-of-hooks": "error", // Enforce rules of hooks
      "react-hooks/exhaustive-deps": "warn", // Warn about missing dependencies in hooks
    },
  },
];