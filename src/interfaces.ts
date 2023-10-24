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
  html: string;
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
  og?: {
    siteImagePath?: string;
    baseImagePath?: string;
    fontColor?: string;
    backgroundColor?: string;
  };
};
