import type { Config } from "./interfaces";

const year = new Date().getFullYear();

const config: Config = {
  googleFonts: "Londrina+Solid:wght@900",
  nav: {
    classes: "border-b-2 border-black",
    titleClasses: "font-bold",
  },
  index: {
    titleFontFamily: "Londrina Solid, sans-serif",
    titleClasses: "text-8xl",
  },
  post: {
    titleClasses: "text-6xl",
    titleFontFamily: "Londrina Solid, sans-serif",
  },
  footer: {
    content: `©︎ ${year} AUTHOR, All Rights Reserved.`,
  },
  notFound: {
    titleClasses: "text-9xl",
    titleFontFamily: "Londrina Solid, sans-serif",
  },
};

export default config;
