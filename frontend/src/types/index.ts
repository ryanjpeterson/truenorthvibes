export interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
}

export interface Block {
  __component: string;
  id: number;
  // Component: blog.you-tube-embed
  url?: string;
  caption?: string;
  // Component: blog.text-block
  content?: any[]; // JSON blocks for RichText
  // Component: blog.single-image
  image?: StrapiImage;
  // Component: blog.multiple-images
  images?: StrapiImage[];
}

export interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  date: string; // 'YYYY-MM-DD' based on type: 'date'
  thumbnail: StrapiImage;
  body?: Block[];
}