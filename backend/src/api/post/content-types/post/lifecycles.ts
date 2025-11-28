// backend/src/api/post/content-types/post/lifecycles.ts

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

const getPlainTextFromBody = (body: any[]) => {
  if (!body || !Array.isArray(body)) return '';
  return body.map((block: any) => {
    if (block.content && Array.isArray(block.content)) {
      return extractText(block.content);
    }
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

    // 1. If the payload contains the body (e.g. standard save), use it
    if (data.body && Array.isArray(data.body) && data.body.some((b: any) => b.content)) {
      console.log('📝 [Lifecycle] Updating from payload body...');
      data.searchableContent = getPlainTextFromBody(data.body);
      return;
    }

    // 2. If body is missing (e.g. during Publish), fetch the DRAFT version
    try {
      const entry = await strapi.db.query('api::post.post').findOne({
        where,
        select: ['documentId', 'locale']
      });

      if (entry && entry.documentId) {
        // Explicitly fetch the 'draft' version to get the latest content
        const draft = await strapi.documents('api::post.post').findOne({
          documentId: entry.documentId,
          locale: entry.locale,
          status: 'draft', 
          populate: ['body'],
        });

        if (draft && draft.body) {
          const fullText = getPlainTextFromBody(draft.body);
          if (fullText.length > 0) {
            data.searchableContent = fullText;
            console.log(`✅ [Lifecycle] Rebuilt searchableContent from DRAFT (${fullText.length} chars).`);
          }
        }
      }
    } catch (error) {
      console.error('❌ [Lifecycle] Error fetching draft:', error);
    }
  },
};