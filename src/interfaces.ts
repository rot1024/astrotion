export type Client = {
  getAllPosts(): Promise<Post[]>;
  getPostById(postId: string): Promise<Post>;
  getPostBySlug(slug: string): Promise<Post>;
  getPostContent(postId: string): Promise<PostContent>;
};

export type Database = {
  title: string;
  description: string;
  icon?: string;
  cover?: string;
  iconExpiryTime?: Date;
  coverExpiryTime?: Date;
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
  iconExpiryTime?: Date;
  coverExpiryTime?: Date;
  featuredImageExpiryTime?: Date;
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
