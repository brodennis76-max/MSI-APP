
// UniversalPDFGenerator.js - FINAL SPACING FIX VERSION

import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// FIXED: Page metrics in points - 0.75 inch borders
const MARGIN_PT = 54; // 72 * 0.75 = 0.75 inch
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

// FIXED: Line height for 12pt font with 1.25 spacing
const LINE_HEIGHT = 15; // 12 * 1.25 = 15pt

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
      [...node.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const okImg = tag === 'img' && name === 'src' && /^data:image\//i.test(attr.value);
        if (!okImg) node.removeAttribute(attr.name);
      });
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
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const blob = await res.blob();
  return await new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
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
       .replace(/\n{3,}/g, '\n\n')
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

  const checkPage = (advance = 0) => {
    if (y + advance > pageHeight - margin) {
      pdf.addPage();
      y = margin;
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
        // Empty line - still advance y to maintain spacing
        checkPage(lineHeight);
        y += lineHeight;
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
        const type = /^data:image\/jpeg/i.test(dataUrl) ? 'JPEG' : 'PNG';
        pdf.addImage(dataUrl, type, fx, y, w, h);
        floatRegion = { side, x: fx, yTop: y - lineHeight, yBottom: y + h, w };
        return;
      }
      checkPage(h);
      const type = /^data:image\/jpeg/i.test(dataUrl) ? 'JPEG' : 'PNG';
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

    if (tag === 'ul' || tag === 'ol') {
      // FINAL FIX: Minimal spacing before list - only check page, don't add extra spacing
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
      // FINAL FIX: Minimal spacing after list - only check page, don't add extra spacing
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

    // No spacing after paragraphs/divs - drawWrappedText already advances y after the last line
  };

  return {
    getY: () => y,
    setY: v => { y = v; },
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
      for (const n of container.childNodes) {
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
  const safeName = client.name || client.id || 'Unknown Client';
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

  // FINAL FIX: Remove container spacing to prevent double spacing
  const sectionStyle = 'margin-top: 0;';          // REMOVED: 30pt to prevent double spacing
  const subsectionStyle = 'margin-top: 0;';      // REMOVED: 15pt to prevent double spacing

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Instructions - ${escapeHtml(safeName)}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; line-height: 1.25; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 30pt; }
    .header h1 { font-size: 20px; margin: 0 0 8px 0; }
    .header h2 { font-size: 18px; margin: 0 0 8px 0; }
    .header h3 { font-size: 14px; font-weight: normal; color: #666; margin: 0 0 12px 0; }
    .row { display: flex; justify-content: center; gap: 16px; align-items: center; margin-bottom: 6px; }
    .logo { width: 180px; height: auto; }
    .qr { width: 120px; height: auto; }
    /* FINAL FIX: No container spacing - let titles handle spacing */
    .section { ${sectionStyle} }
    .subsection { ${subsectionStyle} }
    /* FINAL FIX: Title spacing matches web exactly */
    .section-title { font-size: 16px; font-weight: bold; margin: 30pt 0 15pt 0; }
    .subsection-title { font-size: 14px; font-weight: bold; margin: 15pt 0 15pt 0; }
    .info { font-size: 12px; }
    .notice { border: 1px solid #000; padding: 12pt; margin-top: 15pt; font-size: 12px; }
    /* FINAL FIX: Content spacing matches web exactly */
    .rich p, .rich div { margin: 0 0 15pt 0; }
    /* FINAL FIX: List containers have minimal spacing to match web */
    .rich ul, .rich ol { margin: 0 0 0 1.2em; padding: 0; }  // REMOVED top/bottom margins
    .rich li { margin: 0 0 15pt 0; }
  </style></head><body>
  <div class="header"><div class="row">${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ''}${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" />` : ''}</div>
  <h1>MSI Inventory</h1><h2>Account Instructions:</h2><h3>${escapeHtml(safeName)}</h3></div>
  <div class="section"><div class="section-title">Client Information</div><div class="info">
  <p><strong>Inventory Type:</strong> ${escapeHtml(client.inventoryType ?? '')}</p>
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
  ${teamInstr ? `<div class="section"><div class="section-title">Pre-Inventory Crew Instructions</div><div class="info rich">${rich(teamInstr)}</div></div>` : ''}
  ${noncount ? `<div class="section"><div class="section-title">Non-Count Products</div><div class="info rich">${rich(noncount)}</div></div>` : ''}
  ${progRep || finalize || finRep || processing ? `<div class="section"><div class="section-title">REPORTS</div><div class="info">
  ${progRep ? `<div class="subsection"><div class="subsection-title">Progressives:</div><div class="info rich">${rich(progRep)}</div></div>` : ''}
  ${finalize ? `<div class="subsection"><div class="subsection-title">Finalizing the Count:</div><div class="info rich">${rich(finalize)}</div></div>` : ''}
  ${finRep ? `<div class="subsection"><div class="subsection-title">Final Reports:</div><div class="info rich">${rich(finRep)}</div></div>` : ''}
  ${processing ? `<div class="subsection"><div class="subsection-title">Final Processing:</div><div class="info rich">${rich(processing)}</div></div>` : ''}
  </div></div>` : ''}
  </body></html>`;
}

// ---------- Main entry ----------

export async function generateAccountInstructionsPDF(options) {
  const { clientId, clientData } = options || {};
  let client = clientData;
  if (!client && clientId) {
    const ref = doc(db, 'clients', clientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Client not found');
    client = { id: snap.id, ...snap.data() };
  }
  if (!client) throw new Error('Missing client data');

  const assetBase = client.assetBase || DEFAULT_JSDELIVR_BASE;
  let logoDataUrl = '';
  if (client.logoDataUrl && /^data:image\//i.test(client.logoDataUrl)) {
    logoDataUrl = client.logoDataUrl;
  } else if (client.logoUrl) {
    try { logoDataUrl = await fetchAsDataURL(client.logoUrl); } catch {}
  }
  
  // Get QR code path: use qrFileName if available, otherwise fall back to qrPath, then default
  let qrPath = '';
  if (client.qrFileName) {
    // If qrFileName exists, construct the path
    qrPath = `qr-codes/${client.qrFileName}`;
  } else if (client.qrPath) {
    // Fall back to existing qrPath field
    qrPath = client.qrPath;
  } else {
    // Default QR code
    qrPath = 'qr-codes/1450 Scanner Program.png';
  }
  
  let qrDataUrl = '';
  try { qrDataUrl = await getRepoImageDataUrl(qrPath, assetBase); } catch {}

  if (Platform.OS === 'web') {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    let y = MARGIN_PT;
    
    // FIXED: Use the corrected line height constant
    const checkPageBreak = (advance) => { if (y + advance > PAGE_HEIGHT_PT - MARGIN_PT) { pdf.addPage(); y = MARGIN_PT; } };

    // FIXED: Pass correct spacing parameters to renderer
    const htmlRenderer = createHtmlRenderer(pdf, { 
      pageWidth: PAGE_WIDTH_PT, 
      pageHeight: PAGE_HEIGHT_PT, 
      margin: MARGIN_PT, 
      lineHeight: LINE_HEIGHT, // Now 15pt instead of 14pt
      baseFontSize: 12 
    });

    // Images
    if (logoDataUrl) {
      try {
        const type = /^data:image\/jpeg/i.test(logoDataUrl) ? 'JPEG' : 'PNG';
        pdf.addImage(logoDataUrl, type, MARGIN_PT, y - 44, 120, 36);
      } catch {}
    }
    if (qrDataUrl) {
      try {
        const type = /^data:image\/jpeg/i.test(qrDataUrl) ? 'JPEG' : 'PNG';
        const size = 120;
        const x = PAGE_WIDTH_PT - MARGIN_PT - size;
        pdf.addImage(qrDataUrl, type, x, MARGIN_PT - 8, size, size);
      } catch {}
    }

    // Header text
    const headerLines = ['MSI Inventory', 'Account Instructions:', client.name || client.id || 'Unknown Client'];
    headerLines.forEach((text, i) => {
      if (i < 2) { pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0); }
      else { pdf.setFont('helvetica', 'normal'); pdf.setTextColor(102, 102, 102); }
      const fontSize = i === 0 ? 20 : i === 1 ? 18 : 14;
      pdf.setFontSize(fontSize);
      const textWidth = pdf.getTextWidth(text);
      const x = (PAGE_WIDTH_PT - textWidth) / 2;
      checkPageBreak(20);
      pdf.text(text, x, y);
      if (i === 2) pdf.setTextColor(0, 0, 0);
      y += i === 2 ? 30 : 20;
    });

    const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT);

    // === FIXED: PROPER HEADER SPACING ===
    
    // h1 headers - DOUBLE space before (2 * LINE_HEIGHT)
    const sectionHeader = (title) => {
      y += LINE_HEIGHT * 2; // Double space before h1
      checkPageBreak(LINE_HEIGHT);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(title, MARGIN_PT, y);
      y += LINE_HEIGHT; // Only single advance after
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    // h2/h3 headers - SINGLE space before (1 * LINE_HEIGHT)
    const subSectionHeader = (title) => {
      y += LINE_HEIGHT; // Single space before h2/h3
      checkPageBreak(LINE_HEIGHT);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(title, MARGIN_PT, y);
      y += LINE_HEIGHT; // Only single advance after
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
    if (updatedAt) { checkPageBreak(LINE_HEIGHT); pdf.text(`Updated: ${updatedAt}`, MARGIN_PT, y); y += LINE_HEIGHT; }
    if (client.PIC) renderKV('PIC', client.PIC);
    if (client.verification) renderKV('Verification', client.verification);
    if (client.startTime) renderKV('Start Time', client.startTime);
    y += 8;

    // Notice
    const notice = '"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"';
    const wrapped = pdf.splitTextToSize(notice, contentWidth - 16);
    const boxHeight = wrapped.length * LINE_HEIGHT + 16;
    pdf.setDrawColor(0); pdf.setLineWidth(1);
    pdf.rect(MARGIN_PT, y, contentWidth, boxHeight);
    let ty = y + 12;
    wrapped.forEach(w => { pdf.text(w, MARGIN_PT + 8, ty); ty += LINE_HEIGHT; });
    y += boxHeight + 20;

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
        subSectionHeader('Area Mapping');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(areaMappingText);
        y = htmlRenderer.getY();
      } else {
        subSectionHeader('Area Mapping');
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
      htmlRenderer.setY(y);
      await htmlRenderer.renderHtmlString(text);
      y = htmlRenderer.getY();
    };

    await writeRichSection('INVENTORY PROCEDURES', client.Inv_Proc);
    await writeRichSection('Audits', client.Audits);
    await writeRichSection('Inventory Flow', client.Inv_Flow);
    await writeRichSection('Special Notes', client.Special_Notes);
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
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(text);
          y = htmlRenderer.getY();
        }
      }
      
      if (finalize) {
        subSectionHeader('Finalizing the Count:');
        const text = String(finalize).trim();
        if (text) {
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(text);
          y = htmlRenderer.getY();
        }
      }
      
      if (finRep) {
        subSectionHeader('Final Reports:');
        const text = String(finRep).trim();
        if (text) {
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(text);
          y = htmlRenderer.getY();
        }
      }
      
      if (processing) {
        subSectionHeader('Final Processing:');
        const text = String(processing).trim();
        if (text) {
          // Add newline before "MSI Inventory Reports" if it starts the text
          const cleanProcessing = text.replace(/^MSI Inventory Reports/gi, '\nMSI Inventory Reports');
          htmlRenderer.setY(y);
          await htmlRenderer.renderHtmlString(cleanProcessing);
          y = htmlRenderer.getY();
        }
      }
    }

    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  }

  // Native: expo-print - FINAL SPACING FIX APPLIED
  const { printToFileAsync } = await import('expo-print');
  const html = buildHtml(client, { logoDataUrl, qrDataUrl });
  const result = await printToFileAsync({ html, base64: false, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
  return result.uri;
}

export default function UniversalPDFGenerator() { return null; }
