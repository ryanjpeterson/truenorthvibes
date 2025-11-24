export interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
}

export interface Sponsor {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  url?: string;
  icon: StrapiImage;
}

export interface Category {
  id: number;
  documentId: string;
  name: string;
  description: string;
}

export interface Block {
  __component: string;
  id: number;
  url?: string;
  caption?: string;
  content?: any[];
  image?: StrapiImage;
  images?: StrapiImage[];
}

export interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  date: string;
  hero: StrapiImage;
  body?: Block[];
  sponsor?: Sponsor; 
  category?: Category;
}

export interface Home {
  id: number;
  documentId: string;
  header: string;
  subtitle: string;
  hero: StrapiImage;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination: Pagination;
  };
}