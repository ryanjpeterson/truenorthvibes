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

// Helper to fetch draft content with deep population
const getContentFromDraft = async (documentId: string, locale: string) => {
  try {
    const draft = await strapi.documents('api::post.post').findOne({
      documentId,
      locale,
      status: 'draft',
      // FIX: Deep populate the body dynamic zone to get nested 'content' fields
      populate: {
        body: {
          populate: '*'
        }
      },
    });

    if (draft && draft.body) {
      return getPlainTextFromBody(draft.body);
    }
  } catch (error) {
    console.error('❌ [Lifecycle] Error fetching draft:', error);
  }
  return null;
};

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // 1. Try using payload body
    let fullText = '';
    if (data.body && Array.isArray(data.body) && data.body.some((b: any) => b.content)) {
      fullText = getPlainTextFromBody(data.body);
    }

    // 2. If payload body is missing or sparse (e.g. during Publish), try fetching Draft
    if (!fullText && data.documentId) {
       // Note: data.locale might be needed depending on context, defaulting to data.locale
       const draftText = await getContentFromDraft(data.documentId, data.locale);
       if (draftText) fullText = draftText;
    }

    if (fullText) {
      data.searchableContent = fullText;
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
        // Fetch draft with corrected populate
        const fullText = await getContentFromDraft(entry.documentId, entry.locale);
        
        if (fullText && fullText.length > 0) {
          data.searchableContent = fullText;
          console.log(`✅ [Lifecycle] Rebuilt searchableContent from DRAFT (${fullText.length} chars).`);
        }
      }
    } catch (error) {
      console.error('❌ [Lifecycle] Error in beforeUpdate:', error);
    }
  },
};