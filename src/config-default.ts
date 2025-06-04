import type { Client, Options } from "notiondown";

export type Config = {
  title?: string;
  description?: string;
  dateFormat?: string;
  postsPerPage?: number;
  head?: {
    titleSeparator?: string;
  };
  og?: {
    siteImagePath?: string;
    baseImagePath?: string;
    backgroundColor?: string;
    titleStyle?: {
      x?: number;
      y?: number;
      width?: number;
      fontFamily?: string[];
      fontSize?: number;
      lineHeight?: number;
      lineClamp?: number;
      align?: "left" | "right" | "center";
      color?: string;
    };
  };
  googleFonts?: string;
  body?: {
    classes?: string;
    fontFamily?: string;
  };
  nav?: {
    classes?: string;
    titleClasses?: string;
    titleFontFamily?: string;
  };
  index?: {
    titleClasses?: string;
    titleFontFamily?: string;
  };
  post?: {
    classes?: string;
    fontFamily?: string;
    titleClasses?: string;
    titleFontFamily?: string;
  };
  footer?: {
    content?: string;
    classes?: string;
  };
  notFound?: {
    titleClasses?: string;
    titleFontFamily?: string;
    title?: string;
    description?: string;
  };
  notiondown?: Partial<Options>;
};

const year = new Date().getFullYear();

const config: Config = {
  googleFonts: "Londrina+Solid:wght@900",
  nav: {
    classes: "border-b-2 border-black",
    titleClasses: "font-bold",
  },
  index: {
    titleFontFamily: "Londrina Solid, sans-serif",
    titleClasses: "text-7xl md:text-8xl",
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
  notiondown: {
    filter: {
      published: {
        enabled: true,
        value: true
      },
      date: {
        enabled: true,
        operator: "on_or_before",
        value: "now"
      }
    },
    properties: {
      title: "Page",
    }
  }
};

export default config;
