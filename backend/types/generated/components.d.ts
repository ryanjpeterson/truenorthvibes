import type { Schema, Struct } from '@strapi/strapi';

export interface BlogMultipleImages extends Struct.ComponentSchema {
  collectionName: 'components_blog_multiple_images';
  info: {
    displayName: 'MultipleImages';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
  };
}

export interface BlogSingleImage extends Struct.ComponentSchema {
  collectionName: 'components_blog_single_images';
  info: {
    displayName: 'SingleImage';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface BlogTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_blog_text_blocks';
  info: {
    displayName: 'TextBlock';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface BlogYouTubeEmbed extends Struct.ComponentSchema {
  collectionName: 'components_blog_you_tube_embeds';
  info: {
    displayName: 'YouTubeEmbed';
  };
  attributes: {
    url: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blog.multiple-images': BlogMultipleImages;
      'blog.single-image': BlogSingleImage;
      'blog.text-block': BlogTextBlock;
      'blog.you-tube-embed': BlogYouTubeEmbed;
    }
  }
}
