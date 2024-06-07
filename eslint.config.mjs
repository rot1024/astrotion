import configs from "eslint-config-reearth";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
  ...configs,
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
