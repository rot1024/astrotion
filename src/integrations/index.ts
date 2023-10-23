import type { AstroIntegration } from "astro";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:config:done": async () => {},
  },
});
