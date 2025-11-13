
// UniversalPDFGenerator.js - FINAL SPACING FIX VERSION

import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// FIXED: Page metrics in points - 0.75 inch borders
const MARGIN_PT = 54; // 72 * 0.75 = 0.75 inch
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

// FIXED: Line height for 12pt font with single spacing (1.0)
const LINE_HEIGHT = 12; // 12 * 1.0 = 12pt (single spacing)

// DOM guards
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
const SHOW_ELEMENT = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_ELEMENT : 1;

// Allowed tags
const ALLOWED_TAGS = ['b','strong','i','em','u','br','p','div','ul','ol','li','img'];

// --------- Repo asset bases ---------
const ORG = 'brodennis76-max';
const REPO = 'MSI-APP';
const BRANCH_TAG = 'main';
const DEFAULT_JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${ORG}/${REPO}@${BRANCH_TAG}`;
const RAW_BASE = `https://raw.githubusercontent.com/${ORG}/${REPO}/${BRANCH_TAG}`;

// ---------- Sanitizer ----------

function sanitizeHtmlSubset(input) {
  const html = String(input || '');
  // If the input doesn't contain any HTML tags, return it as-is to preserve all characters
  if (!/<[^>]+>/.test(html)) {
    return html;
  }
  if (HAS_DOM) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, SHOW_ELEMENT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_TAGS.includes(tag)) {
        // Preserve text content when removing disallowed tags
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
        return;
      }
      // Remove ALL attributes (style, class, id, etc.) - keep only the tag
      // This prevents inline styles from causing extra spacing
      while (node.attributes.length > 0) {
        node.removeAttribute(node.attributes[0].name);
      }
      if (tag === 'img') {
        const src = node.getAttribute('src') || '';
        if (!/^data:image\//i.test(src)) {
          node.remove();
        } else {
          node.setAttribute('style', 'max-width:100%; height:auto;');
        }
      }
    });
    return root.innerHTML;
  }
  return html
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<([^>\s/]+)([^>]*)>/gi, (m, tag, attrs) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.includes(t)) return '';
      if (t === 'img') {
        const srcMatch = attrs.match(/\ssrc=(["'])(.*?)\1/i);
        const src = srcMatch ? srcMatch[2] : '';
        if (!/^data:image\//i.test(src)) return '';
        return `<img src="${src}" style="max-width:100%; height:auto;">`;
      }
      // Return tag without any attributes to prevent styling issues
      return `<${t}>`;
    })
    .replace(/<\/(?!b|strong|i|em|u|p|div|ul|ol|li)\w+>/gi, '');
}

// ---------- Utils ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchAsDataURL(url) {
  // Direct fetch for any URL (GitHub, etc.)
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  
  // Get content type from response headers
  const contentType = res.headers.get('content-type') || 'image/png';
  console.log('📥 Fetching image (direct fetch):', {
    url: url.substring(0, 80) + '...',
    contentType,
    status: res.status,
    ok: res.ok
  });
  
  // Get blob with explicit type
  const blob = await res.blob();
  console.log('📦 Blob received:', {
    size: blob.size,
    type: blob.type,
    expectedType: contentType
  });
  
  // Ensure blob has correct type (sometimes blob.type is empty)
  const typedBlob = blob.type ? blob : new Blob([blob], { type: contentType });
  
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result;
      console.log('✅ Data URL created:', {
        length: dataUrl.length,
        prefix: dataUrl.substring(0, 50),
        hasImagePrefix: /^data:image\//i.test(dataUrl)
      });
      resolve(dataUrl);
    };
    fr.onerror = (err) => {
      console.error('❌ FileReader error:', err);
      reject(new Error('Failed to read blob as data URL'));
    };
    fr.readAsDataURL(typedBlob);
  });
}

function encodePathPreserveSlashes(p) {
  return String(p || '').split('/').map(encodeURIComponent).join('/');
}

async function getRepoImageDataUrl(relPath, assetBase) {
  const path = encodePathPreserveSlashes(relPath);
  const bases = [assetBase || DEFAULT_JSDELIVR_BASE, RAW_BASE];
  for (const base of bases) {
    try {
      const url = `${base}/${path}`;
      return await fetchAsDataURL(url);
    } catch {}
  }
  throw new Error('All repo image fetch attempts failed');
}

// Strip HTML for inline KV fields
function htmlToPlainInline(html) {
  if (!html) return '';
  let s = String(html);
  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*div[^>]*>/gi, '')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*\/?(ul|ol)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\r\n/g, '\n')
       .replace(/\n{2,}/g, '\n')  // Normalize multiple newlines to single for consistent spacing
       .replace(/[ \	]+/g, ' ')
       .replace(/^\s+|\s+$/gm, '');
  return s.trim();
}

// ---------- Web HTML -> jsPDF renderer ----------

function createHtmlRenderer(pdf, opts) {
  const {
    pageWidth = PAGE_WIDTH_PT,
    pageHeight = PAGE_HEIGHT_PT,
    margin = MARGIN_PT,
    lineHeight = LINE_HEIGHT, // FIXED: Use correct line height
    bulletIndent = 14,
    listIndent = 18,
    underlineOffset = 2,
    baseFontSize = 12
  } = opts || {};

  let y = margin;
  let floatRegion = null;

  const clearFloatIfPassed = () => {
    if (floatRegion && y > floatRegion.yBottom) floatRegion = null;
  };

  // Get client info from closure or pass it in
  let clientInfo = null;
  let isFirstPage = true;
  let isInventoryChecklistPage = false;
  
  const setClientInfo = (client) => {
    clientInfo = client;
  };
  
  const setInventoryChecklistFlag = (flag) => {
    isInventoryChecklistPage = flag;
  };
  
  const drawPageHeader = () => {
    if (isFirstPage || isInventoryChecklistPage || !clientInfo) return;
    
    const headerY = margin - 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    
    // Client name
    const clientName = (clientInfo.name || clientInfo.id || 'Unknown Client').toUpperCase();
    pdf.text(clientName, margin, headerY);
    
    // Scan type (if available)
    if (clientInfo.scanType) {
      const scanTypeText = `Scan ${clientInfo.scanType.toUpperCase()}`;
      const scanTypeWidth = pdf.getTextWidth(scanTypeText);
      pdf.text(scanTypeText, pageWidth - margin - scanTypeWidth, headerY);
    }
  };
  
  const checkPage = (advance = 0) => {
    if (y + advance > pageHeight - margin) {
      pdf.addPage();
      drawPageHeader(); // Add header to new page
      y = margin + 10; // Start content below header
      floatRegion = null;
    }
  };

  const setFontFor = (ctx) => {
    const style =
      ctx.bold && ctx.italic ? 'bolditalic' :
      ctx.bold ? 'bold' :
      ctx.italic ? 'italic' : 'normal';
    pdf.setFont('helvetica', style);
    pdf.setFontSize(baseFontSize);
  };

  const lineBox = (indent) => {
    const fullX = margin + indent;
    const fullW = pageWidth - margin - fullX;
    if (!floatRegion) return { x: fullX, w: fullW };
    const within = y >= floatRegion.yTop && y <= floatRegion.yBottom;
    if (!within) return { x: fullX, w: fullW };
    if (floatRegion.side === 'right') {
      const blockedRight = pageWidth - margin - floatRegion.x;
      return { x: fullX, w: Math.max(24, fullW - blockedRight) };
    }
    const leftBlockWidth = (floatRegion.x + (floatRegion.w || 0)) - fullX;
    const x = Math.max(fullX, floatRegion.x + (floatRegion.w || 0) + 6);
    const w = pageWidth - margin - x;
    return { x, w: Math.max(24, w) };
  };

  const wrapMeasureLines = (ctx, text, indent) => {
    setFontFor(ctx);
    const words = String(text).split(/\s+/);
    let line = '';
    const out = [];
    const measure = (s) => pdf.getTextWidth(s);
    for (let i = 0; i < words.length; i++) {
      clearFloatIfPassed();
      const { x, w } = lineBox(indent);
      const word = words[i];
      const candidate = line ? line + ' ' + word : word;
      
      // If the word itself is too long, split it character by character
      if (measure(word) > w) {
        if (line) {
          out.push({ x, text: line });
          line = '';
        }
        // Split long word character by character
        let wordLine = '';
        for (let j = 0; j < word.length; j++) {
          const char = word[j];
          const charCandidate = wordLine + char;
          if (measure(charCandidate) <= w) {
            wordLine = charCandidate;
          } else {
            if (wordLine) {
              clearFloatIfPassed();
              const { x: charX } = lineBox(indent);
              out.push({ x: charX, text: wordLine });
            }
            wordLine = char;
          }
        }
        if (wordLine) {
          clearFloatIfPassed();
          const { x: charX } = lineBox(indent);
          line = wordLine;
        }
      } else if (measure(candidate) <= w) {
        line = candidate;
      } else {
        if (line) out.push({ x, text: line });
        line = word;
      }
    }
    if (line) {
      clearFloatIfPassed();
      const { x } = lineBox(indent);
      out.push({ x, text: line });
    }
    return out;
  };

  const drawWrappedText = (ctx, text, indent) => {
    if (!text) return;
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    lines.forEach((raw, idx) => {
      // Only normalize bullet characters if they exist in the text
      // This prevents issues with plain text that doesn't contain bullets
      let cleaned = raw;
      if (raw.includes('•') || raw.includes('\u2022')) {
        cleaned = raw.replace(/(\S)•/g, '$1\n•').replace(/(\S)\u2022/g, '$1\n\u2022');
      }
      // Normalize whitespace but preserve all characters
      cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
      if (idx > 0) { 
        checkPage(lineHeight); 
        y += lineHeight; 
      }
      if (!cleaned) {
        // Skip empty lines to prevent extra spacing
        return;
      }
      const pieces = cleaned.split('\n');
      pieces.forEach((piece, pi) => {
        if (pi > 0) { checkPage(lineHeight); y += lineHeight; }
        const wrapped = wrapMeasureLines(ctx, piece, indent);
        wrapped.forEach((ln, wi) => {
          checkPage(lineHeight);
          setFontFor(ctx);
          pdf.text(ln.text, ln.x, y);
          if (ctx.underline) {
            const w = pdf.getTextWidth(ln.text);
            pdf.line(ln.x, y + underlineOffset, ln.x + w, y + underlineOffset);
          }
          // CRITICAL: Always advance y after rendering each line to prevent overlap
          y += lineHeight;
        });
      });
    });
  };

  const drawImage = async (node, x, maxWidth, asFloat) => {
    try {
      if (!HAS_DOM || typeof Image === 'undefined') return;
      const dataUrl = node.getAttribute('src') || '';
      if (!/^data:image\//i.test(dataUrl)) return;
      const img = new Image();
      img.src = dataUrl;
      await new Promise(res => { img.onload = res; });
      const ratio = img.height / img.width || 1;
      const w = Math.min(maxWidth, img.width || maxWidth);
      const h = w * ratio;
      if (asFloat) {
        const side = (node.getAttribute('data-float') || '').toLowerCase() === 'left' ? 'left' : 'right';
        const fx = side === 'right' ? (pageWidth - margin - w) : (margin + (parseFloat(node.getAttribute('data-indent')) || 0));
        let type = 'PNG';
        if (/^data:image\/jpeg/i.test(dataUrl)) {
          type = 'JPEG';
        } else if (/^data:image\/gif/i.test(dataUrl)) {
          type = 'PNG'; // jsPDF doesn't support GIF directly, convert to PNG
        }
        pdf.addImage(dataUrl, type, fx, y, w, h);
        floatRegion = { side, x: fx, yTop: y - lineHeight, yBottom: y + h, w };
        return;
      }
      checkPage(h);
      let type = 'PNG';
      if (/^data:image\/jpeg/i.test(dataUrl)) {
        type = 'JPEG';
      } else if (/^data:image\/gif/i.test(dataUrl)) {
        type = 'PNG'; // jsPDF doesn't support GIF directly, convert to PNG
      }
      pdf.addImage(dataUrl, type, x, y, w, h);
      y += h;
    } catch {}
  };

  const renderNode = async (node, ctx, indent) => {
    if (node.nodeType === 3) {
      // Skip whitespace-only text nodes to prevent extra spacing
      const text = node.nodeValue || '';
      if (!text.trim()) return;
      drawWrappedText(ctx, text, indent);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { checkPage(lineHeight); y += lineHeight; return; }
    if (tag === 'b' || tag === 'strong') ctx.bold = true;
    if (tag === 'i' || tag === 'em') ctx.italic = true;
    if (tag === 'u') ctx.underline = true;

    // Handle p and div tags - they are block elements but don't add extra spacing
    // drawWrappedText handles all spacing internally
    if (tag === 'p' || tag === 'div') {
      // Process child nodes - drawWrappedText will handle spacing
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          const text = child.nodeValue || '';
          if (!text.trim()) continue;
          drawWrappedText(ctx, text, indent);
        } else if (child.nodeType === 1) {
          const snap = { ...ctx };
          await renderNode(child, snap, indent);
        }
      }
      // No extra spacing after p/div - drawWrappedText already advanced y
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      // Minimal spacing before list - only check page, don't add extra spacing
      checkPage(lineHeight);
      let index = 1;
      const items = Array.from(node.children).filter(el => el.tagName.toLowerCase() === 'li');
      for (const li of items) {
        // Each list item starts on a new line - let drawWrappedText handle spacing
        checkPage(lineHeight);

        const { x } = lineBox(indent);
        const marker = tag === 'ul' ? '\u2022' : `${index}.`;
        setFontFor({});
        pdf.text(marker, x, y);

        // Render all child nodes in order (text and elements together)
        for (const child of li.childNodes) {
          if (child.nodeType === 3) {
            // Text node - render it with proper indentation
            const text = child.nodeValue || '';
            if (text.trim()) {
              drawWrappedText({ ...ctx }, text, indent + bulletIndent);
            }
          } else if (child.nodeType === 1) {
            // Element node - render it with list indent
            await renderNode(child, { ...ctx }, indent + listIndent);
          }
        }
        
        // drawWrappedText already advanced y after the last line
        // No extra spacing needed between list items
        index += 1;
      }
      // Minimal spacing after list - only check page, don't add extra spacing
      checkPage(lineHeight);
      return;
    }

    if (tag === 'img') {
      const floatSide = (node.getAttribute('data-float') || '').toLowerCase();
      const isFloat = floatSide === 'right' || floatSide === 'left';
      const x = margin + indent;
      const maxWidth = pageWidth - margin - x;
      await drawImage(node, x, maxWidth, isFloat);
      return;
    }

    // Process child nodes, skipping whitespace-only text nodes
    for (const child of node.childNodes) {
      // Skip whitespace-only text nodes to prevent extra spacing between elements
      if (child.nodeType === 3) {
        const text = child.nodeValue || '';
        if (!text.trim()) continue;
      }
      const snap = { ...ctx };
      await renderNode(child, snap, indent);
    }

    // No spacing after other elements - drawWrappedText already advances y after the last line
  };

  return {
    getY: () => y,
    setY: v => { y = v; },
    setClientInfo: (client) => setClientInfo(client),
    setInventoryChecklistFlag: (flag) => setInventoryChecklistFlag(flag),
    markFirstPageComplete: () => { isFirstPage = false; },
    async renderHtmlString(html, indentPx = 0) {
      if (!HAS_DOM) return;
      // Only normalize bullet characters if they exist in the text
      // This prevents issues with plain text that doesn't contain bullets
      const htmlStr = String(html);
      const normalized = htmlStr.includes('•') || htmlStr.includes('\u2022') 
        ? htmlStr.replace(/(\S)•/g, '$1\n•').replace(/(\S)\u2022/g, '$1\n\u2022')
        : htmlStr;
      const clean = sanitizeHtmlSubset(normalized);
      const container = document.createElement('div');
      container.innerHTML = clean;
      let prevWasBlockElement = false;
      for (const n of container.childNodes) {
        // Skip whitespace-only text nodes
        if (n.nodeType === 3) {
          const text = n.nodeValue || '';
          if (!text.trim()) continue;
        }
        // If previous element was a block element (p, div) and current is also block, don't add extra spacing
        // drawWrappedText already handles spacing
        if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (prevWasBlockElement && (tag === 'p' || tag === 'div')) {
            // Don't add spacing - drawWrappedText will handle it
          }
          prevWasBlockElement = (tag === 'p' || tag === 'div');
        }
        await renderNode(n, { bold: false, italic: false, underline: false }, indentPx);
      }
      floatRegion = null;
    }
  };
}

// ---------- Data helpers ----------

function formatUpdatedAt(val) {
  try {
    if (!val) return '';
    const date = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
    return date.toLocaleDateString('en-US');
  } catch { return ''; }
}

function extractPreInventoryBundle(sections) {
  const empty = { generalText: '', areaMappingRaw: '', storePrepRaw: '' };
  if (!sections) return empty;
  if (typeof sections === 'object' && !Array.isArray(sections)) {
    return {
      generalText: sections['Pre-Inventory'] ?? '',
      areaMappingRaw: sections['Area Mapping'] ?? '',
      storePrepRaw: sections['Store Prep Instructions'] ?? ''
    };
  }
  if (Array.isArray(sections)) {
    const pre = sections.find(s => (s?.sectionName || '').toString().toLowerCase() === 'pre-inventory');
    if (!pre) return empty;
    const generalText = typeof pre.content === 'string' ? pre.content : '';
    const subs = Array.isArray(pre.subsections) ? pre.subsections : [];
    const findSub = (title) => {
      const entry = subs.find(x => (x?.sectionName || '').toString().toLowerCase() === title.toLowerCase());
      const text = entry ? (entry.content ?? entry.text ?? entry.value ?? '') : '';
      return typeof text === 'string' ? text : '';
    };
    return { generalText, areaMappingRaw: findSub('Area Mapping'), storePrepRaw: findSub('Store Prep Instructions') };
  }
  return empty;
}

// ---------- Native HTML builder (FINAL SPACING FIX) ----------

function buildHtml(client, assets) {
  const baseName = (client.name || client.id || 'Unknown Client').toUpperCase();
  const inventoryType = client.inventoryType ? ` ${client.inventoryType.toUpperCase()}` : '';
  const safeName = `${baseName}${inventoryType}`;
  const updatedAt = formatUpdatedAt(client.updatedAt);
  const extracted = extractPreInventoryBundle(client.sections);
  const preInv = String(extracted.generalText || client.preInventory || '').trim();
  const areaMapping = String(extracted.areaMappingRaw).trim();
  const storePrep = String(extracted.storePrepRaw).trim();
  const invProc = String(client.Inv_Proc ?? '').trim();
  const audits = String(client.Audits ?? '').trim();
  const invFlow = String(client.Inv_Flow ?? '').trim();
  const specialNotes = String(client.Special_Notes ?? '').trim();
  const teamInstr = String(client['Team-Instr'] ?? '').trim();
  const noncount = String(client.noncount ?? '').trim();
  const progRep = String(client.Prog_Rep ?? '').trim();
  const finalize = String(client.Finalize ?? '').trim();
  const finRep = String(client.Fin_Rep ?? '').trim();
  const processing = String(client.Processing ?? '').trim();
  const logoDataUrl = assets?.logoDataUrl && /^data:image\//i.test(assets.logoDataUrl) ? assets.logoDataUrl : '';
  const qrDataUrl = assets?.qrDataUrl && /^data:image\//i.test(assets.qrDataUrl) ? assets.qrDataUrl : '';
  const rich = (h) => sanitizeHtmlSubset(h);

  // ALL SPACING MATCHES TEXT SIZE (12pt font = 12pt line height), DOUBLE SPACE BEFORE H1
  const sectionStyle = 'margin-top: 0;';
  const subsectionStyle = 'margin-top: 0;';
  const LINE_HEIGHT_PT = 12; // Line height matches font size (12pt font = 12pt line height)

  // Build header text for pages
  const headerClientName = (client.name || client.id || 'Unknown Client').toUpperCase();
  const headerScanType = client.scanType ? `Scan ${client.scanType.toUpperCase()}` : '';
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Instructions - ${escapeHtml(safeName)}</title>
  <style>
    @page { 
      size: letter; 
      margin: 0.75in;
      @top-left {
        content: "${escapeHtml(headerClientName)}";
        font-family: Helvetica, Arial, sans-serif;
        font-size: 18pt;
        color: #000;
      }
      @top-right {
        content: "${escapeHtml(headerScanType)}";
        font-family: Helvetica, Arial, sans-serif;
        font-size: 18pt;
        color: #000;
      }
    }
    @page:first {
      @top-left { content: ""; }
      @top-right { content: ""; }
    }
    @page.inventory-checklist {
      @top-left { content: ""; }
      @top-right { content: ""; }
    }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; line-height: 1.0; font-size: 12pt; }
    .header { text-align: left; margin-bottom: ${LINE_HEIGHT_PT}pt; position: relative; }
    .header-top { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { width: 150px; height: auto; max-width: 150px; }
    .qr { width: 120px; height: auto; max-width: 120px; }
    .header-content { margin-left: 162px; margin-top: 0; }
    .header h1 { font-size: 20px; margin: 0 0 8px 0; }
    .header h2 { font-size: 18px; margin: 0 0 8px 0; }
    .header h3 { font-size: 14px; font-weight: normal; color: #666; margin: 0 0 12px 0; }
    /* ALL SPACING MATCHES TEXT SIZE (12pt font = 12pt line height), DOUBLE SPACE BEFORE H1 */
    .section { ${sectionStyle} }
    .subsection { ${subsectionStyle} }
    /* Double spacing before H1 headers, single spacing after */
    .section-title { font-size: 16px; font-weight: bold; margin: ${LINE_HEIGHT_PT * 2}pt 0 ${LINE_HEIGHT_PT}pt 0; }
    .subsection-title { font-size: 14px; font-weight: bold; margin: ${LINE_HEIGHT_PT}pt 0 ${LINE_HEIGHT_PT}pt 0; }
    .info { font-size: 12px; }
    .notice { border: 1px solid #000; padding: 12pt; margin-top: ${LINE_HEIGHT_PT}pt; font-size: 12px; }
    /* Single LINE_HEIGHT spacing for all content */
    .rich p, .rich div { margin: 0 0 ${LINE_HEIGHT_PT}pt 0; }
    /* Single LINE_HEIGHT spacing for lists */
    .rich ul, .rich ol { margin: 0 0 0 1.2em; padding: 0; }
    .rich li { margin: 0 0 ${LINE_HEIGHT_PT}pt 0; }
  </style></head><body>
  <div class="header">
    <div class="header-top">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : '<div></div>'}
      ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" />` : '<div></div>'}
    </div>
    <div class="header-content">
      <h1>MSI Inventory</h1><h2>Account Instructions:</h2><h3>${escapeHtml(safeName)}</h3>
    </div>
  </div>
  <div class="section"><div class="section-title">Client Information</div><div class="info">
  <p><strong>Inventory Type:</strong> ${escapeHtml(client.inventoryType ?? '')}</p>
  ${client.scanType ? `<p><strong>Scan Type:</strong> Scan ${escapeHtml(client.scanType)}</p>` : ''}
  <p><strong>Updated:</strong> ${escapeHtml(updatedAt)}</p>
  <p><strong>PIC:</strong> ${escapeHtml(client.PIC ?? '')}</p>
  <p><strong>Verification:</strong> ${escapeHtml(client.verification ?? '')}</p>
  </div><div class="notice">"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"</div></div>
  ${preInv || areaMapping || storePrep ? `<div class="section"><div class="section-title">Pre-Inventory</div><div class="info rich">${rich(preInv)}</div>
  ${areaMapping ? `<div class="subsection"><div class="subsection-title">Area Mapping</div><div class="info rich">${rich(areaMapping)}</div></div>` : ''}
  ${storePrep ? `<div class="subsection"><div class="subsection-title">Store Prep/Instructions</div><div class="info rich">${rich(storePrep)}</div></div>` : ''}</div>` : ''}
  ${invProc ? `<div class="section"><div class="section-title">INVENTORY PROCEDURES</div><div class="info rich">${rich(invProc)}</div></div>` : ''}
  ${audits ? `<div class="section"><div class="section-title">Audits</div><div class="info rich">${rich(audits)}</div></div>` : ''}
  ${invFlow ? `<div class="section"><div class="section-title">Inventory Flow</div><div class="info rich">${rich(invFlow)}</div></div>` : ''}
  ${specialNotes ? `<div class="section"><div class="section-title">Special Notes</div><div class="info rich">${rich(specialNotes)}</div></div>` : ''}
  ${client.Departments ? `<div class="section"><div class="section-title">Departments</div><div class="info rich">${rich(client.Departments)}</div></div>` : ''}
  ${teamInstr ? `<div class="section"><div class="section-title">Pre-Inventory Crew Instructions</div><div class="info rich">${rich(teamInstr)}</div></div>` : ''}
  ${noncount ? `<div class="section"><div class="section-title">Non-Count Products</div><div class="info rich">${rich(noncount)}</div></div>` : ''}
  ${progRep || finalize || finRep || processing ? `<div class="section"><div class="section-title">REPORTS</div><div class="info">
  ${progRep ? `<div class="subsection"><div class="subsection-title">Progressives:</div><div class="info rich">${rich(progRep)}</div></div>` : ''}
  ${finalize ? `<div class="subsection"><div class="subsection-title">Finalizing the Count:</div><div class="info rich">${rich(finalize)}</div></div>` : ''}
  ${finRep ? `<div class="subsection"><div class="subsection-title">Final Reports:</div><div class="info rich">${rich(finRep)}</div></div>` : ''}
  ${processing ? `<div class="subsection"><div class="subsection-title">Final Processing:</div><div class="info rich">${rich(processing)}</div></div>` : ''}
  </div></div>` : ''}
  <div style="page-break-before: always;" class="inventory-checklist-page">
    <div class="section">
      <div style="text-align: center; margin-top: 0; font-size: 22pt; font-weight: bold;">INVENTORY CHECKLIST</div>
      <div class="info" style="margin-top: 44pt; font-size: 13pt;">
        <p style="margin-bottom: 26pt; font-size: 13pt;">Store:____________________</p>
        <p style="margin-bottom: 26pt; font-size: 13pt;">Date: ____________________</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 13pt; font-size: 13pt;">
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Computer, power cord, & power strip/extension cord</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Printer, cable & toner</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">base station, power cord, cable & antenna</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Store packet</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Software properly loaded and updated (account disk, priors, etc.)</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Paper</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Machine</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Tape</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Location tags</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Tags</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Account Instructions</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Batteries</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Ladders</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Extra belts</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Crew Schedule</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Managers/Drivers Contact Numbers</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;">Vans - Filled</td>
          </tr>
          <tr>
            <td style="width: 0.5in; border: 1px solid #000; padding: 0; height: 20pt; vertical-align: middle;"></td>
            <td style="border: 1px solid #000; padding: 4pt; height: 20pt; font-size: 13pt; vertical-align: middle;"><b><i>Backup computers, base station, and printer!!!</i></b></td>
          </tr>
        </table>
      </div>
    </div>
  </div>
  </body></html>`;
}

// ---------- Main entry ----------

export async function generateAccountInstructionsPDF(options) {
  console.log('🚀 PDF Generation Started');
  console.log('   Options:', { clientId: options?.clientId, hasClientData: !!options?.clientData });
  console.log('   Platform:', Platform.OS);
  
  try {
    const { clientId, clientData } = options || {};
    let client = clientData;
    
    if (!client && clientId) {
      console.log('📥 Loading client data from Firestore...');
      const ref = doc(db, 'clients', clientId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.error('❌ Client not found in Firestore:', clientId);
        throw new Error('Client not found');
      }
      client = { id: snap.id, ...snap.data() };
      console.log('✅ Loaded client data from Firestore:', {
        id: client.id,
        name: client.name,
        inventoryType: client.inventoryType,
        inventoryTypes: client.inventoryTypes,
        qrFileName: client.qrFileName || '(not set)',
        qrPath: client.qrPath || '(not set)',
        qrUrl: client.qrUrl ? client.qrUrl.substring(0, 50) + '...' : '(not set)'
      });
    } else if (client) {
      console.log('✅ Using provided client data:', {
        id: client.id,
        name: client.name,
        inventoryType: client.inventoryType,
        inventoryTypes: client.inventoryTypes,
        qrFileName: client.qrFileName || '(not set)',
        qrPath: client.qrPath || '(not set)',
        qrUrl: client.qrUrl ? client.qrUrl.substring(0, 50) + '...' : '(not set)'
      });
    }
    
    if (!client) {
      console.error('❌ Missing client data - both clientId and clientData are missing');
      throw new Error('Missing client data');
    }

    const assetBase = client.assetBase || DEFAULT_JSDELIVR_BASE;
    let logoDataUrl = '';
    
    // Load logo: Priority: logoDataUrl > logoUrl > GitHub default
    if (client.logoDataUrl && /^data:image\//i.test(client.logoDataUrl)) {
      logoDataUrl = client.logoDataUrl;
      console.log('✅ Using logoDataUrl from client data');
    } else if (client.logoUrl) {
      try {
        logoDataUrl = await fetchAsDataURL(client.logoUrl);
        console.log('✅ Loaded logo from logoUrl:', client.logoUrl);
      } catch (error) {
        console.warn('⚠️ Failed to load logo from logoUrl:', error.message);
      }
    } else {
      // Load default logo from GitHub repository
      const logoPath = 'qr-codes/MSI LOGO.png';
      try {
        console.log('📥 Loading logo from GitHub:', logoPath);
        logoDataUrl = await getRepoImageDataUrl(logoPath, assetBase);
        console.log('✅ Successfully loaded logo from GitHub:', logoPath);
        console.log('   Data URL length:', logoDataUrl.length, 'chars');
        console.log('   GitHub URL:', `${RAW_BASE}/${encodePathPreserveSlashes(logoPath)}`);
      } catch (error) {
        console.error('❌ Failed to load logo from GitHub:', {
          path: logoPath,
          errorMessage: error.message,
          githubUrl: `${RAW_BASE}/${encodePathPreserveSlashes(logoPath)}`
        });
        console.warn('⚠️ PDF will be generated without logo');
        logoDataUrl = '';
      }
    }
    
    // Get QR code: Only load QR codes for scan accounts
    // Check if client is a scan account (either inventoryType contains "scan" or inventoryTypes includes "scan")
    // Uses case-insensitive regex matching to handle variations in data
    const isScanAccount = 
      /scan/i.test(String(client.inventoryType || '')) ||
      (Array.isArray(client.inventoryTypes) && client.inventoryTypes.some(t => /scan/i.test(String(t))));
    
    let qrPath = '';
    let qrDataUrl = '';
    
    // Wrap QR code loading in try-catch to ensure PDF generation continues even if QR code loading fails
    try {
      if (isScanAccount) {
        console.log('📱 Scan account detected - loading QR code from GitHub for:', client.name || client.id);
        
        // Determine QR code path from client data (all QR codes come from GitHub)
        // Database fields:
        //   - qrFileName: Just the filename (e.g., "Redeemer QR Code.png")
        //   - qrPath: Full path (e.g., "qr-codes/Redeemer QR Code.png")
        // Priority: qrFileName > qrPath > default
        // For scan accounts, always use default if none is explicitly selected
        if (client.qrFileName && client.qrFileName.trim() !== '') {
          // qrFileName is just the filename, construct full path
          qrPath = `qr-codes/${client.qrFileName}`;
          console.log('🔍 Using qrFileName from database:', client.qrFileName);
          console.log('   Constructed GitHub path:', qrPath);
        } else if (client.qrPath && client.qrPath.trim() !== '') {
          // qrPath should already be in format "qr-codes/filename.png" from database
          // But handle edge cases where it might not have the prefix
          if (client.qrPath.startsWith('qr-codes/')) {
            qrPath = client.qrPath;
          } else {
            // If qrPath doesn't start with qr-codes/, prepend it
            qrPath = `qr-codes/${client.qrPath}`;
          }
          console.log('🔍 Using qrPath from database:', client.qrPath);
          console.log('   Final GitHub path:', qrPath);
        } else {
          // Default QR code (fallback if no specific QR code is configured)
          // For scan accounts, always use default if none is selected
          qrPath = 'qr-codes/1450 Scanner Program.png';
          console.log('🔍 No QR code selected - using default QR code from GitHub:', qrPath);
        }
        
        // Load QR code from GitHub repository
        // This will try both jsDelivr CDN and raw.githubusercontent.com
        try {
          console.log('📥 Loading QR code from GitHub:', qrPath);
          qrDataUrl = await getRepoImageDataUrl(qrPath, assetBase);
          console.log('✅ Successfully loaded QR code from GitHub:', qrPath);
          console.log('   Data URL length:', qrDataUrl.length, 'chars');
          console.log('   GitHub URL:', `${RAW_BASE}/${encodePathPreserveSlashes(qrPath)}`);
        } catch (error) {
          console.error('❌ Failed to load QR code from GitHub:', {
            path: qrPath,
            errorMessage: error.message,
            githubUrl: `${RAW_BASE}/${encodePathPreserveSlashes(qrPath)}`
          });
          console.error('   Make sure the QR code file exists in GitHub at:', qrPath);
          console.warn('⚠️ PDF will be generated without QR code');
          qrDataUrl = '';
        }
      } else {
        console.log('ℹ️  Non-scan account - skipping QR code for:', client.name || client.id);
      }
    } catch (qrError) {
      // If QR code loading fails completely, log the error but continue PDF generation
      console.error('❌ CRITICAL: QR code loading failed completely, but continuing PDF generation:', {
        errorMessage: qrError.message,
        errorName: qrError.name,
        errorStack: qrError.stack?.substring(0, 500)
      });
      console.warn('⚠️ PDF will be generated without QR code');
      qrDataUrl = ''; // Ensure qrDataUrl is empty
    }

    if (Platform.OS === 'web') {
      console.log('🌐 Generating PDF for web platform using jsPDF...');
      const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    let y = MARGIN_PT;
    let isFirstPage = true;
    let isInventoryChecklistPage = false;
    
    // Function to draw page header with client name and scan type
    const drawPageHeader = () => {
      if (isFirstPage || isInventoryChecklistPage) return;
      
      const headerY = MARGIN_PT - 10; // Position header slightly above margin
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      
      // Client name
      const clientName = (client.name || client.id || 'Unknown Client').toUpperCase();
      pdf.text(clientName, MARGIN_PT, headerY);
      
      // Scan type (if available)
      if (client.scanType) {
        const scanTypeText = `Scan ${client.scanType.toUpperCase()}`;
        const scanTypeWidth = pdf.getTextWidth(scanTypeText);
        pdf.text(scanTypeText, PAGE_WIDTH_PT - MARGIN_PT - scanTypeWidth, headerY);
      }
    };
    
    // FIXED: Use the corrected line height constant
    const checkPageBreak = (advance) => { 
      if (y + advance > PAGE_HEIGHT_PT - MARGIN_PT) { 
        pdf.addPage(); 
        drawPageHeader(); // Add header to new page
        y = MARGIN_PT + 10; // Start content below header
      } 
    };

    // FIXED: Pass correct spacing parameters to renderer
    const htmlRenderer = createHtmlRenderer(pdf, { 
      pageWidth: PAGE_WIDTH_PT, 
      pageHeight: PAGE_HEIGHT_PT, 
      margin: MARGIN_PT, 
      lineHeight: LINE_HEIGHT, // Single spacing: 12pt (1.0 line height)
      baseFontSize: 12 
    });
    
    // Set client info for page headers in htmlRenderer
    htmlRenderer.setClientInfo(client);
    htmlRenderer.markFirstPageComplete(); // Mark first page as complete after header is drawn

    // Helper function to preload image and get dimensions
    const preloadImage = (dataUrl) => {
      return new Promise((resolve, reject) => {
        if (!HAS_DOM || typeof Image === 'undefined') {
          reject(new Error('Image preloading not available in this environment'));
          return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
        img.src = dataUrl;
      });
    };

    // Helper function to convert image to canvas and get data URL (ensures proper encoding for jsPDF)
    const imageToCanvasDataUrl = (img) => {
      if (!HAS_DOM || typeof HTMLCanvasElement === 'undefined') {
        throw new Error('Canvas not available in this environment');
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width || img.naturalWidth;
      canvas.height = img.height || img.naturalHeight;
      const ctx = canvas.getContext('2d');
      // Draw white background first (helps with transparency issues)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw the image on top
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    };

    // Images
    // Logo in upper left corner - load image to get proper aspect ratio
    let logoWidth = 0;
    let logoHeight = 0;
    let logoX = MARGIN_PT;
    let logoY = MARGIN_PT;
    
    if (logoDataUrl) {
      try {
        // Preload image to get natural dimensions for proper aspect ratio
        const logoImg = await preloadImage(logoDataUrl);
        const maxLogoWidth = 150; // Maximum width in points
        const aspectRatio = logoImg.width / logoImg.height;
        logoWidth = Math.min(maxLogoWidth, logoImg.width);
        logoHeight = logoWidth / aspectRatio;
        
        let type = 'PNG';
        if (/^data:image\/jpeg/i.test(logoDataUrl)) {
          type = 'JPEG';
        } else if (/^data:image\/gif/i.test(logoDataUrl)) {
          type = 'PNG'; // jsPDF doesn't support GIF directly, convert to PNG
        }
        pdf.addImage(logoDataUrl, type, logoX, logoY, logoWidth, logoHeight);
        console.log('✅ Logo image added to PDF (upper left corner)', { width: logoWidth, height: logoHeight, aspectRatio });
      } catch (error) {
        console.error('❌ Failed to add logo image to PDF:', error.message);
      }
    }
    // QR code in upper right corner
    if (qrDataUrl) {
      try {
        // BYPASS Image() entirely — Chrome can't block data URLs this way
        let type = 'PNG';
        if (qrDataUrl.startsWith('data:image/jpeg')) {
          type = 'JPEG';
        } else if (qrDataUrl.startsWith('data:image/gif')) {
          type = 'PNG'; // jsPDF doesn't support GIF directly, convert to PNG
        }
        const maxSize = 120;
        const x = PAGE_WIDTH_PT - MARGIN_PT - maxSize;
        const yPos = MARGIN_PT;

        // Direct addImage — NO preload, NO canvas, NO CORS
        pdf.addImage(qrDataUrl, type, x, yPos, maxSize, maxSize, '', 'FAST');
        
        console.log('QR CODE ADDED DIRECTLY — NO PRELOAD', { type, x, yPos });
      } catch (err) {
        console.error('Still failed (impossible now):', err);
      }
    } else {
      console.warn('⚠️ No QR code data URL available - QR code will not be added to PDF');
    }

    // Header text - positioned to the right of the logo
    const headerTextX = logoDataUrl ? logoX + logoWidth + 12 : MARGIN_PT; // Start after logo with 12pt spacing
    let headerTextY = logoDataUrl ? logoY + (logoHeight / 2) - 10 : MARGIN_PT; // Vertically center with logo
    
    // Build customer name with inventory type
    const customerName = (client.name || client.id || 'Unknown Client').toUpperCase();
    const inventoryType = client.inventoryType ? ` ${client.inventoryType.toUpperCase()}` : '';
    const customerNameWithType = `${customerName}${inventoryType}`;
    
    const headerLines = ['MSI Inventory', 'Account Instructions:', customerNameWithType];
    headerLines.forEach((text, i) => {
      if (i < 2) { pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0); }
      else { pdf.setFont('helvetica', 'normal'); pdf.setTextColor(102, 102, 102); }
      const fontSize = i === 0 ? 20 : i === 1 ? 18 : 14;
      pdf.setFontSize(fontSize);
      // Use spacing proportional to font size (1.0x line height)
      const lineSpacing = fontSize;
      checkPageBreak(lineSpacing);
      pdf.text(text, headerTextX, headerTextY);
      if (i === 2) pdf.setTextColor(0, 0, 0);
      headerTextY += lineSpacing; // Spacing based on font size
    });
    
    // Set y position for content after header (use the bottom of logo or header text, whichever is lower)
    y = logoDataUrl ? Math.max(logoY + logoHeight, headerTextY) + 12 : headerTextY + 12;
    isFirstPage = false; // Mark that we've finished the first page

    const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT);

    // === FIXED: ALL SPACING MATCHES TEXT SIZE (12pt font = 12pt line height), DOUBLE SPACE BEFORE H1 ===
    
    // h1 headers - DOUBLE space before, SINGLE space after
    // Use line height that matches font size (16pt font = 16pt line height)
    const sectionHeader = (title) => {
      y += LINE_HEIGHT * 2; // Double space before h1
      checkPageBreak(LINE_HEIGHT * 2 + 16); // Account for 16pt font height
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(title, MARGIN_PT, y);
      // Advance by line height matching font size (16pt)
      y += 16; // 16pt line height for 16pt font
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    // h2/h3 headers - SINGLE space before and after
    // Use line height that matches font size (14pt font = 14pt line height)
    const subSectionHeader = (title) => {
      y += LINE_HEIGHT; // Single space before h2/h3
      checkPageBreak(LINE_HEIGHT + 14); // Account for 14pt font height
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(title, MARGIN_PT, y);
      // Advance by line height matching font size (14pt)
      y += 14; // 14pt line height for 14pt font
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    // Client Info
    sectionHeader('Client Information');
    const updatedAt = formatUpdatedAt(client.updatedAt);
    const renderKV = (label, value) => {
      if (!value) return;
      const plain = htmlToPlainInline(value);
      if (!plain) return;
      checkPageBreak(LINE_HEIGHT);
      const labelText = `${label}: `;
      const labelWidth = pdf.getTextWidth(labelText);
      pdf.text(labelText, MARGIN_PT, y);
      const startX = MARGIN_PT + labelWidth;
      const maxWidth = contentWidth - labelWidth;
      const lines = pdf.splitTextToSize(plain, maxWidth);
      lines.forEach((ln, idx) => {
        if (idx > 0) { checkPageBreak(LINE_HEIGHT); y += LINE_HEIGHT; }
        pdf.text(ln, startX, y);
      });
      y += LINE_HEIGHT;
    };

    if (client.inventoryType) renderKV('Inventory Type', client.inventoryType);
    if (client.scanType) renderKV('Scan Type', `Scan ${client.scanType}`);
    if (updatedAt) { checkPageBreak(LINE_HEIGHT); pdf.text(`Updated: ${updatedAt}`, MARGIN_PT, y); y += LINE_HEIGHT; }
    if (client.PIC) renderKV('PIC', client.PIC);
    if (client.verification) renderKV('Verification', client.verification);
    if (client.startTime) renderKV('Start Time', client.startTime);
    y += LINE_HEIGHT; // Single LINE_HEIGHT spacing

    // Notice
    const notice = '"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"';
    const wrapped = pdf.splitTextToSize(notice, contentWidth - 16);
    const boxHeight = wrapped.length * LINE_HEIGHT + 16;
    pdf.setDrawColor(0); pdf.setLineWidth(1);
    pdf.rect(MARGIN_PT, y, contentWidth, boxHeight);
    let ty = y + 12;
    wrapped.forEach(w => { pdf.text(w, MARGIN_PT + 8, ty); ty += LINE_HEIGHT; });
    y += boxHeight + LINE_HEIGHT; // Single LINE_HEIGHT spacing after notice

    // === PRE-INVENTORY \u2013 FIXED OVERLAPS ===
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `\u2022 ALR disk is ${client.ALR}.` : '';

    const storeMappingText = `STANDARD STORE MAPPING APPLIES.

Map as Follows:
DO NOT ADD ADDITIONAL AREA NUMBERS

1. 1#21, 1#61 gondolas. The last two digits of each number identify left or right side of gondola (from front of store). For example 1021 would be first right side of the gondola going right to left in the store. The left side of the gondola would be 1061. The next gondola right side would be 1121, then 1161 right side.
2. Front end caps are 3801 (sub location 01, 02 etc. for each end cap)
3. Back end caps are 3901 (sub location 01, 02 etc. for each end cap)
4. Front wall 4001.
5. Left wall 4101.
6. Rear wall 4201.
7. Right wall 4301.
8. Check stand. Each checkstand will have it's own location.
9. Displays 6001, 6101, 6201, etc.
10. Office 7001
11. Backroom use 9000 series

NOTE: Stores are to be counted in 4' sections or by door.
Use the map from the prior.
In all areas: Location 01 will be J-hooks, 02 will be floor displays, and 03 will be tops.

* All locations must have a description. Utilize the location description utility as needed.

Counters to number each display with a yellow tag to match posting sheet locations.`;

    const combinedPre = [alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n');

    if (combinedPre || areaMappingRaw || storePrepRaw || true) {
      sectionHeader('Pre-Inventory');

      if (combinedPre) {
        const text = String(combinedPre).trim();
        if (text) {
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(text);
          y = htmlRenderer.getY();
        }
      }

      const areaMappingText = String(areaMappingRaw || '').trim();
      if (areaMappingText) {
        // Reduce spacing before subsection if it comes right after content
        // Only add minimal spacing if there's already content above
        if (y > MARGIN_PT + LINE_HEIGHT * 2) {
          y += LINE_HEIGHT; // Single space before subsection
        }
        checkPageBreak(LINE_HEIGHT + 14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Area Mapping', MARGIN_PT, y);
        y += 14; // 14pt line height for 14pt font
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(areaMappingText);
        y = htmlRenderer.getY();
      } else {
        // Reduce spacing before subsection if it comes right after content
        if (y > MARGIN_PT + LINE_HEIGHT * 2) {
          y += LINE_HEIGHT; // Single space before subsection
        }
        checkPageBreak(LINE_HEIGHT + 14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Area Mapping', MARGIN_PT, y);
        y += 14; // 14pt line height for 14pt font
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const defaultText = String(storeMappingText).trim();
        if (defaultText) {
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(defaultText);
          y = htmlRenderer.getY();
        }
      }

      const storePrepText = String(storePrepRaw || '').trim();
      if (storePrepText) {
        subSectionHeader('Store Prep/Instructions');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(storePrepText);
        y = htmlRenderer.getY();
      }
    }

    // Rich sections
    const writeRichSection = async (title, body) => {
      const text = String(body || '').trim();
      if (!text) return;
      sectionHeader(title);
      // Normalize multiple newlines to single newlines to prevent extra spacing
      const cleanText = text.replace(/\n{2,}/g, '\n');
      htmlRenderer.setY(y);
      await htmlRenderer.renderHtmlString(cleanText);
      y = htmlRenderer.getY();
    };

    await writeRichSection('INVENTORY PROCEDURES', client.Inv_Proc);
    await writeRichSection('Audits', client.Audits);
    await writeRichSection('Inventory Flow', client.Inv_Flow);
    await writeRichSection('Special Notes', client.Special_Notes);
    
    // Departments section (after Special Notes)
    if (client.Departments) {
      const departmentsText = String(client.Departments).trim();
      if (departmentsText) {
        sectionHeader('Departments');
        const cleanText = departmentsText.replace(/\n{2,}/g, '\n');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(cleanText);
        y = htmlRenderer.getY();
      }
    }
    
    await writeRichSection('Pre-Inventory Crew Instructions', client['Team-Instr']);
    await writeRichSection('Non-Count Products', client.noncount);

    // Reports
    const progRep = String(client.Prog_Rep ?? '').trim();
    const finalize = String(client.Finalize ?? '').trim();
    const finRep = String(client.Fin_Rep ?? '').trim();
    const processing = String(client.Processing ?? '').trim();

    if (progRep || finalize || finRep || processing) {
      sectionHeader('REPORTS');
      
      if (progRep) {
        subSectionHeader('Progressives:');
        const text = String(progRep).trim();
        if (text) {
          // Normalize multiple newlines to single newlines to prevent extra spacing
          const cleanText = text.replace(/\n{2,}/g, '\n');
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(cleanText);
          y = htmlRenderer.getY();
        }
      }
      
      if (finalize) {
        subSectionHeader('Finalizing the Count:');
        const text = String(finalize).trim();
        if (text) {
          // Normalize multiple newlines to single newlines to prevent extra spacing
          const cleanText = text.replace(/\n{2,}/g, '\n');
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(cleanText);
          y = htmlRenderer.getY();
        }
      }
      
      if (finRep) {
        subSectionHeader('Final Reports:');
        const text = String(finRep).trim();
        if (text) {
          // Normalize multiple newlines to single newlines to prevent extra spacing
          const cleanText = text.replace(/\n{2,}/g, '\n');
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(cleanText);
          y = htmlRenderer.getY();
        }
      }
      
      if (processing) {
        subSectionHeader('Final Processing:');
        const text = String(processing).trim();
        if (text) {
          // Normalize multiple newlines to single newlines to prevent extra spacing
          const cleanProcessing = text.replace(/\n{2,}/g, '\n');
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(cleanProcessing);
          y = htmlRenderer.getY();
        }
      }
    }

    // Add Inventory Checklist page (on its own page)
    isInventoryChecklistPage = true; // Mark this as the inventory checklist page (no header)
    if (htmlRenderer && htmlRenderer.setInventoryChecklistFlag) {
      htmlRenderer.setInventoryChecklistFlag(true); // Also mark in htmlRenderer
    }
    pdf.addPage();
    y = MARGIN_PT;
    
    // Title: INVENTORY CHECKLIST (centered, 22pt)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    const titleText = 'INVENTORY CHECKLIST';
    const titleWidth = pdf.getTextWidth(titleText);
    const titleX = (PAGE_WIDTH_PT - titleWidth) / 2;
    pdf.text(titleText, titleX, y);
    y += 22 * 2; // Double space after title (22pt line height for 22pt font)
    
    // Store:____________________ (left justified, double space after, 13pt)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(13);
    const storeText = 'Store:____________________';
    pdf.text(storeText, MARGIN_PT, y);
    y += 13 * 2; // Double space after (13pt line height for 13pt font)
    
    // Date: ____________________ (left justified, double space after, 13pt)
    const dateText = 'Date: ____________________';
    pdf.text(dateText, MARGIN_PT, y);
    y += 13 * 2; // Double space after
    
    // Two column table
    const checkboxColumnWidth = 36; // 0.5 inch = 36 points
    const contentColumnX = MARGIN_PT + checkboxColumnWidth;
    const contentColumnWidth = PAGE_WIDTH_PT - MARGIN_PT - contentColumnX;
    
    // Checklist items
    const checklistItems = [
      'Computer, power cord, & power strip/extension cord',
      'Printer, cable & toner',
      'base station, power cord, cable & antenna',
      'Store packet',
      'Software properly loaded and updated (account disk, priors, etc.)',
      'Paper',
      'Machine',
      'Tape',
      'Location tags',
      'Tags',
      'Account Instructions',
      'Batteries',
      'Ladders',
      'Extra belts',
      'Crew Schedule',
      'Managers/Drivers Contact Numbers',
      'Vans - Filled',
      'Backup computers, base station, and printer!!!'
    ];
    
    // Draw table structure and items (13pt font)
    const checklistLineHeight = 20; // Increased from 13pt to 20pt for better text fit
    checklistItems.forEach((item, index) => {
      // Set font first
      if (index === checklistItems.length - 1) {
        // Last item: bold and italic
        pdf.setFont('helvetica', 'bolditalic');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setFontSize(13);
      
      // Wrap text if needed - calculate how many lines
      const lines = pdf.splitTextToSize(item, contentColumnWidth - 8);
      const cellHeight = lines.length * checklistLineHeight;
      
      // Check page break before drawing
      checkPageBreak(cellHeight);
      
      const cellTopY = y;
      const cellBottomY = y + cellHeight;
      
      // Draw checkbox column border (left side)
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(MARGIN_PT, cellTopY, checkboxColumnWidth, cellHeight);
      
      // Draw content column border (right side)
      pdf.rect(contentColumnX, cellTopY, contentColumnWidth, cellHeight);
      
      // Draw text lines, vertically centered in cell
      lines.forEach((line, lineIndex) => {
        const lineY = cellTopY + (lineIndex * checklistLineHeight) + (checklistLineHeight / 2) + 4;
        pdf.text(line, contentColumnX + 4, lineY);
      });
      
      // Move y position down for next item
      y = cellBottomY;
    });

    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    console.log('💾 Saving PDF as:', filename);
    pdf.save(filename);
    console.log('✅ PDF saved successfully:', filename);
    return filename;
  }

  // Native: expo-print - FINAL SPACING FIX APPLIED
  console.log('📱 Generating PDF for native platform using expo-print...');
  const { printToFileAsync } = await import('expo-print');
  const html = buildHtml(client, { logoDataUrl, qrDataUrl });
  console.log('📄 HTML generated, length:', html.length);
  const result = await printToFileAsync({ html, base64: false, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
  console.log('✅ PDF generated successfully:', result.uri);
  return result.uri;
  
  } catch (error) {
    console.error('❌ CRITICAL ERROR in PDF generation:', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack?.substring(0, 1000),
      options: { clientId: options?.clientId, hasClientData: !!options?.clientData }
    });
    // Re-throw the error so calling code can handle it
    throw error;
  }
}

export default function UniversalPDFGenerator() { return null; }
