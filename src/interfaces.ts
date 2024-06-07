export type Client = {
  getAllPosts(): Promise<Post[]>;
  getPostById(postId: string): Promise<Post | undefined>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  getPostContent(postId: string): Promise<PostContent>;
};

export type Database = {
  title: string;
  description: string;
  icon?: string;
  cover?: string;
  images?: Map<string, string>;
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  date: string;
  updatedAt: string;
  excerpt: string;
  tags: Tag[];
  rank: number;
  raw?: any;
  icon?: string;
  cover?: string;
  featuredImage?: string;
  images?: Map<string, string>;
};

export type PostContent = {
  markdown: string;
  images?: Map<string, string>;
};

export type Tag = {
  id: string;
  name: string;
  color?: string;
};

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
};
