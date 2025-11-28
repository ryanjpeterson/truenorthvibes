// Helper: Recursively extract text from Strapi Blocks nodes
const extractText = (nodes: any[]): string => {
  if (!Array.isArray(nodes)) return '';
  let text = '';
  for (const node of nodes) {
    if (node.text) text += node.text + ' ';
    if (node.children && Array.isArray(node.children)) {
      text += extractText(node.children);
    }
  }
  return text;
};

// Helper: Process the body array and return plain text
const getPlainTextFromBody = (body: any[]) => {
  if (!body || !Array.isArray(body)) return '';
  
  return body.map((block: any) => {
    // 1. Strapi Blocks (Array)
    if (block.content && Array.isArray(block.content)) {
      return extractText(block.content);
    }
    // 2. Markdown/String
    if (typeof block.content === 'string') {
      return block.content;
    }
    return '';
  }).join(' ').trim();
};

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    if (data.body) {
      data.searchableContent = getPlainTextFromBody(data.body);
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    // 1. If we have a body with actual content (not just IDs), use it directly.
    if (data.body && Array.isArray(data.body) && data.body.some((b: any) => b.content)) {
      console.log('📝 [Lifecycle] Body modified. Updating index from payload...');
      data.searchableContent = getPlainTextFromBody(data.body);
      return;
    }

    // 2. If body is missing or partial (just IDs), FETCH the full post from DB.
    try {
      // Cast to 'any' to bypass strict Typescript return type checks
      const existingPost = await strapi.entityService.findOne('api::post.post', where.id, {
        populate: ['body'], 
      }) as any;

      if (existingPost && existingPost.body) {
        const fullText = getPlainTextFromBody(existingPost.body);
        
        // Only update if we found text
        if (fullText.length > 0) {
          data.searchableContent = fullText;
          console.log(`✅ [Lifecycle] Rebuilt searchableContent (${fullText.length} chars).`);
        }
      }
    } catch (error) {
      console.error('❌ [Lifecycle] Error fetching existing post:', error);
    }
  },
};