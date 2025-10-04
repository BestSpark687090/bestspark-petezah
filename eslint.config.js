import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import jsonParser from "jsonc-eslint-parser";
import localPlugin from "./eslint-rules/index.js";

export default defineConfig([
  eslintConfigPrettier,
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    plugins: {
      json,
      local: localPlugin
    },
    languageOptions: {
      parser: jsonParser,
    },
    rules: {
      "local/sort-labels": "error",
    },
    extends: ["json/recommended"],
  },
  {
    plugins: {
      markdown
    },
    extends: ["markdown/recommended"],
    rules: {
      "markdown/no-html": "error",
      "markdown/no-bare-urls": "error",
    },
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css },
    extends: ["css/recommended"],
  },
  {
    ignores: [
      "node_modules",
      "external",
      "public/storage/ag/g/**/*",
      "public/storage/ag/g2/**/*",
      "public/storage/ag/a/emulatorjs/**/*",
      "public/scram/**/*",
      "public/petezah/**/*",
      "**/*.min.css",
      "public/epoxy/**/*",
      "public/bare-mux/**/*"
    ],
  },
]);
