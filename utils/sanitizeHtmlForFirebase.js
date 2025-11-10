/**
 * Sanitize HTML for Firebase storage
 * Removes all inline styles, class attributes, and unnecessary attributes
 * Keeps only essential HTML tags and structure
 */

// Allowed tags for Firebase storage
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'ul', 'ol', 'li'];

// DOM guards
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
const SHOW_ELEMENT = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_ELEMENT : 1;

/**
 * Sanitize HTML by removing all inline styles, classes, and unnecessary attributes
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Clean HTML with only essential tags and no styling
 */
export function sanitizeHtmlForFirebase(html) {
  if (!html) return '';
  const htmlStr = String(html);
  
  // If the input doesn't contain any HTML tags, return it as-is
  if (!/<[^>]+>/.test(htmlStr)) {
    return htmlStr;
  }
  
  if (HAS_DOM) {
    const root = document.createElement('div');
    root.innerHTML = htmlStr;
    const walker = document.createTreeWalker(root, SHOW_ELEMENT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    
    nodes.forEach(node => {
      const tag = node.tagName.toLowerCase();
      
      // Remove disallowed tags but preserve their text content
      if (!ALLOWED_TAGS.includes(tag)) {
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
        return;
      }
      
      // Remove ALL attributes (style, class, id, etc.) - keep only the tag
      while (node.attributes.length > 0) {
        node.removeAttribute(node.attributes[0].name);
      }
    });
    
    return root.innerHTML;
  }
  
  // Fallback for non-DOM environments: strip all attributes
  return htmlStr
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/<([^>\s/]+)([^>]*)>/gi, (m, tag, attrs) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.includes(t)) return '';
      // Return tag without any attributes
      return `<${t}>`;
    })
    .replace(/<\/(?!b|strong|i|em|u|p|div|ul|ol|li|br)\w+>/gi, '');
}


