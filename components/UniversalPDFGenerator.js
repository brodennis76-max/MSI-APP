import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// Page metrics in points
const MARGIN_PT = 72;
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

// DOM guards for web usage and SSR safety
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
const SHOW_ELEMENT = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_ELEMENT : 1;

// Allowed tags for sanitized rich content
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'ul', 'ol', 'li', 'img'];

/**
 * Sanitizes HTML to a safe subset.
 * Web path uses DOM. Native path uses a conservative regex fallback.
 * Keeps only allowed tags. For <img>, only data URLs are allowed.
 */
function sanitizeHtmlSubset(input) {
  const html = String(input || '');

  if (HAS_DOM) {
    const root = document.createElement('div');
    root.innerHTML = html;

    const walker = document.createTreeWalker(root, SHOW_ELEMENT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_TAGS.includes(tag)) {
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
        return;
      }
      // Strip attributes except img src with data URL
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

  // Native fallback with conservative filtering
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

// Helper function for rich HTML content
function rich(html) {
  return sanitizeHtmlSubset(html);
}

// Escape for labels and titles only
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Web helper to convert a remote image to a data URL
 */
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

/**
 * Convert bundled PNG asset to data URL for Expo (native)
 */
async function bundledPngToDataUrl(moduleRef) {
  if (!moduleRef) return null;
  try {
    const asset = Asset.fromModule(moduleRef);
    await asset.downloadAsync();
    const resp = await fetch(asset.localUri);
    const blob = await resp.blob();
    return await new Promise(resolve => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error loading bundled asset:', e);
    return null;
  }
}

/**
 * Encode a path preserving slashes for URL construction
 */
function encodePathPreserveSlashes(p) {
  return String(p || '').split('/').map(encodeURIComponent).join('/');
}

// Base URL for GitHub assets via jsDelivr CDN
const DEFAULT_ASSET_BASE = 'https://cdn.jsdelivr.net/gh/brodennis76-max/MSI-APP@main';

/**
 * Fetch a PNG from GitHub via jsDelivr CDN and convert to data URL
 * @param {string} relPath - Relative path from repo root (e.g., 'qr-codes/1450 Scanner Program.png')
 * @param {string} assetBase - Base URL for assets (defaults to DEFAULT_ASSET_BASE)
 * @returns {Promise<string>} Data URL
 */
async function githubPngToDataUrl(relPath, assetBase = DEFAULT_ASSET_BASE) {
  const encoded = encodePathPreserveSlashes(relPath);
  const url = `${assetBase}/${encoded}`;
  return await fetchAsDataURL(url);
}

/**
 * Web rich HTML renderer for jsPDF
 * Supports b i u, p, div, br, ul, ol, li, and <img src="data:image/...">
 */
function createHtmlRenderer(pdf, opts) {
  const {
    pageWidth = PAGE_WIDTH_PT,
    pageHeight = PAGE_HEIGHT_PT,
    margin = MARGIN_PT,
    lineHeight = 14,
    bulletIndent = 14,
    listIndent = 18,
    underlineOffset = 2,
    baseFontSize = 12
  } = opts || {};

  let y = margin;

  const checkPage = (advance = 0) => {
    if (y + advance > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const drawText = (ctx, text, x, width) => {
    if (!text) return;
    const style = ctx.bold && ctx.italic ? 'bolditalic'
      : ctx.bold ? 'bold'
      : ctx.italic ? 'italic'
      : 'normal';
    pdf.setFont('helvetica', style);
    pdf.setFontSize(baseFontSize);

    const lines = pdf.splitTextToSize(text, width);
    lines.forEach((ln, idx) => {
      if (idx > 0) {
        checkPage(lineHeight);
        y += lineHeight;
      }
      pdf.text(ln, x, y);
      if (ctx.underline) {
        const w = pdf.getTextWidth(ln);
        pdf.line(x, y + underlineOffset, x + w, y + underlineOffset);
      }
    });
  };

  const drawImage = async (dataUrl, x, maxWidth) => {
    try {
      if (!HAS_DOM || typeof Image === 'undefined') return;
      const img = new Image();
      img.src = dataUrl;
      await new Promise(res => { img.onload = res; });
      const ratio = img.height / img.width || 1;
      const w = Math.min(maxWidth, img.width || maxWidth);
      const h = w * ratio;
      checkPage(h);
      const type = /^data:image\/jpeg/i.test(dataUrl) ? 'JPEG' : 'PNG';
      pdf.addImage(dataUrl, type, x, y, w, h);
      y += h;
    } catch {
      // ignore failures silently
    }
  };

  const renderNode = async (node, ctx, indent) => {
    if (node.nodeType === 3) {
      if (!node.nodeValue) return;
      const x = margin + indent;
      const width = pageWidth - margin - x;
      const lines = node.nodeValue.replace(/\r\n/g, '\n').split('\n');
      lines.forEach((raw, idx) => {
        const text = raw.replace(/[ \t]+/g, ' ').trim();
        if (idx > 0) { checkPage(lineHeight); y += lineHeight; }
        if (text) drawText(ctx, text, x, width);
      });
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = node.tagName.toLowerCase();

    if (tag === 'br') {
      checkPage(lineHeight);
      y += lineHeight;
      return;
    }
    if (tag === 'p' || tag === 'div') {
      checkPage(lineHeight);
      y += tag === 'p' ? lineHeight : 6;
    }
    if (tag === 'b' || tag === 'strong') ctx.bold = true;
    if (tag === 'i' || tag === 'em') ctx.italic = true;
    if (tag === 'u') ctx.underline = true;

    if (tag === 'ul' || tag === 'ol') {
      // if a list follows a header, ensure a clean lead-in line
      checkPage(lineHeight);
      y += lineHeight;
      let index = 1;
      const items = Array.from(node.children).filter(el => el.tagName.toLowerCase() === 'li');
      for (const li of items) {
        // start each bullet on a fresh line
        checkPage(lineHeight);
        y += lineHeight;

        const marker = tag === 'ul' ? '•' : `${index}.`;
        const markerX = margin + indent;
        const contentX = markerX + bulletIndent;
        const width = pageWidth - margin - contentX;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(baseFontSize);
        pdf.text(marker, markerX, y);

        const liCtx = { ...ctx };
        let firstChunk = true;
        for (const child of li.childNodes) {
          if (child.nodeType === 3) {
            const t = child.nodeValue;
            if (t && t.trim()) {
              if (!firstChunk) { checkPage(lineHeight); y += lineHeight; }
              drawText(liCtx, t, contentX, width);
              firstChunk = false;
            }
          } else {
            await renderNode(child, liCtx, indent + listIndent);
          }
        }
        index += 1;
      }
      // small space after list
      checkPage(6);
      y += 6;
      return;
    }

    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      if (/^data:image\//i.test(src)) {
        const x = margin + indent;
        const maxWidth = pageWidth - margin - x;
        await drawImage(src, x, maxWidth);
      }
      return;
    }

    for (const child of node.childNodes) {
      const snap = { ...ctx };
      await renderNode(child, snap, indent);
    }
    // Add small gap after paragraph for readability
    if (tag === 'p') {
      checkPage(lineHeight);
      y += 2;
    }
  };

  return {
    getY: () => y,
    setY: v => { y = v; },
    async renderHtmlString(html, indentPx = 0) {
      const clean = sanitizeHtmlSubset(html);
      if (!HAS_DOM) return;
      const container = document.createElement('div');
      container.innerHTML = clean;
      for (const n of container.childNodes) {
        await renderNode(n, { bold: false, italic: false, underline: false }, indentPx);
      }
    }
  };
}

/**
 * Formats Firestore timestamps or dates
 */
function formatUpdatedAt(val) {
  try {
    if (!val) return '';
    const date = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
    return date.toLocaleDateString('en-US');
  } catch {
    return '';
  }
}

// Resolve section texts from either a map object or an array of entries
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
    return {
      generalText,
      areaMappingRaw: findSub('Area Mapping'),
      storePrepRaw: findSub('Store Prep Instructions')
    };
  }
  return empty;
}

export async function generateAccountInstructionsPDF(options) {
  // options: { clientId?: string, clientData?: object }
  const { clientId, clientData } = options || {};

  let client = clientData;
  if (!client && clientId) {
    const ref = doc(db, 'clients', clientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Client not found');
    }
    client = { id: snap.id, ...snap.data() };
  }
  if (!client) {
    throw new Error('Missing client data');
  }

  // Resolve assets once (logo, QR) for both paths
  const assetBase = client.assetBase || DEFAULT_ASSET_BASE;

  // Logo: prefer data URL on client, fallback to fetch from URL if provided
  let logoDataUrl = '';
  if (client.logoDataUrl && /^data:image\//i.test(client.logoDataUrl)) {
    logoDataUrl = client.logoDataUrl;
  } else if (client.logoUrl) {
    try { logoDataUrl = await fetchAsDataURL(client.logoUrl); } catch { logoDataUrl = ''; }
  }

  // QR from GitHub path (default path if not supplied)
  let qrDataUrl = '';
  const qrPath = client.qrPath || 'qr-codes/1450 Scanner Program.png';
  try {
    qrDataUrl = await githubPngToDataUrl(qrPath, assetBase);
  } catch {
    qrDataUrl = '';
  }

  if (Platform.OS === 'web') {
    // Web: use jsPDF
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });

    // Create HTML renderer instance
    const htmlRenderer = createHtmlRenderer(pdf, {
      pageWidth: PAGE_WIDTH_PT,
      pageHeight: PAGE_HEIGHT_PT,
      margin: MARGIN_PT,
      lineHeight: 14,
      baseFontSize: 12
    });
    
    // Simple HTML to plain text for fields that don't need formatting (Client Information)
    const htmlToPlainInline = (html) => {
      if (!html) return '';
      
      // First, sanitize HTML using DOM API if available (web only)
      let s = HAS_DOM ? sanitizeHtmlSubset(html) : String(html);
      
      // Decode HTML entities FIRST (before stripping tags)
      s = s
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      
      // Convert block elements to newlines BEFORE stripping tags
      s = s
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/p\s*[^>]*>/gi, '\n')
        .replace(/<\s*p\s*[^>]*>/gi, '')
        .replace(/<\s*\/div\s*[^>]*>/gi, '\n')
        .replace(/<\s*div\s*[^>]*>/gi, '')
        .replace(/<\s*\/li\s*[^>]*>/gi, '\n')
        .replace(/<\s*li\s*[^>]*>/gi, '• ')
        .replace(/<\s*\/ul\s*[^>]*>/gi, '\n')
        .replace(/<\s*ul\s*[^>]*>/gi, '')
        .replace(/<\s*\/ol\s*[^>]*>/gi, '\n')
        .replace(/<\s*ol\s*[^>]*>/gi, '');
      
      // Strip ALL remaining HTML tags (including all attributes)
      s = s.replace(/<[^>]*>/g, '');
      
      // Normalize whitespace
      s = s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      s = s.replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/gm, '');
      
      return s.trim();
    };

    // Compute centered header lines
    const headerLines = [
      'MSI Inventory',
      'Account Instructions:',
      client.name || client.id || 'Unknown Client'
    ];

    pdf.setFont('helvetica', 'bold');
    let y = MARGIN_PT;
    const checkPageBreak = (advance, keepWithNext = false) => {
      if (y + advance > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
      }
    };

    const checkPageBreakWithContent = (headerHeight, contentHeight) => {
      // If header would be orphaned (less than 2 lines of content after it), start new page
      if (y + headerHeight + contentHeight > PAGE_HEIGHT_PT - MARGIN_PT && 
          y + headerHeight + 30 > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
      }
    };

    // Write helper: uses HTML renderer to preserve formatting (bold, italic, lists, etc.)
    const writeRich = async (text, width, lineH) => {
      const str = String(text || '');
      if (!str) return;
      
      // Sync y position with htmlRenderer
      htmlRenderer.setY(y);
      // Render HTML with formatting preserved
      await htmlRenderer.renderHtmlString(str, 0);
      // Sync y position back
      y = htmlRenderer.getY();
    };

    const sectionHeader = (title) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50);
      pdf.text(title, MARGIN_PT, y);
      y += 18;
      // add one full body line to ensure the next text does not share the header baseline
      checkPageBreak(lineHeight);
      y += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    headerLines.forEach((text, i) => {
      // First two lines bold; client name normal weight and slightly smaller than subheader
      if (i < 2) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
      } else {
        pdf.setFont('helvetica', 'normal');
        // lighter gray for client name
        pdf.setTextColor(102, 102, 102);
      }
      const fontSize = i === 0 ? 20 : i === 1 ? 18 : 14;
      pdf.setFontSize(fontSize);
      const textWidth = pdf.getTextWidth(text);
      const x = (PAGE_WIDTH_PT - textWidth) / 2;
      checkPageBreak(20);
      pdf.text(text, x, y);
      // reset to black after client name line to avoid affecting following content
      if (i === 2) {
        pdf.setTextColor(0, 0, 0);
      }
      y += i === 2 ? 30 : 20; // extra space after client name
    });

    // Client Information section
    const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    checkPageBreakWithContent(20, 100); // Ensure header stays with content
    pdf.text('Client Information', MARGIN_PT, y);
    y += 20;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const updatedAt = formatUpdatedAt(client.updatedAt);
    const lineHeight = 14;
    
    // Helper to render key-value pairs with formatted values
    const renderKeyValue = (label, value, useFormatting = true) => {
      if (!value) return;
      const labelText = `${label}: `;
      pdf.setFont('helvetica', 'normal');
      const labelWidth = pdf.getTextWidth(labelText);
      checkPageBreak(lineHeight);
      pdf.text(labelText, MARGIN_PT, y);
      
      const startX = MARGIN_PT + labelWidth;
      const maxWidth = contentWidth - labelWidth;
      
      // Always strip HTML and render as plain text for Client Information
      // This ensures no HTML tags show up in the PDF
      const plainText = htmlToPlainInline(value);
      if (plainText) {
        const wrapped = pdf.splitTextToSize(plainText, maxWidth);
        wrapped.forEach((line, idx) => {
          if (idx > 0) {
            checkPageBreak(lineHeight);
            y += lineHeight;
          }
          pdf.text(line, startX, y);
        });
        y += lineHeight;
      } else {
        // If no text after stripping, still move to next line
        y += lineHeight;
      }
    };
    
    // Render each field
    if (client.inventoryType) {
      renderKeyValue('Inventory Type', client.inventoryType, false);
    }
    if (updatedAt) {
      checkPageBreak(lineHeight);
      pdf.text(`Updated: ${updatedAt}`, MARGIN_PT, y);
      y += lineHeight;
    }
    if (client.PIC) {
      renderKeyValue('PIC', client.PIC, true);
    }
    if (client.verification) {
      renderKeyValue('Verification', client.verification, true);
    }
    if (client.startTime) {
      renderKeyValue('Start Time', client.startTime, true);
    }
    y += 8;

    // Boxed notice
    const notice = '"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"';
    const wrapped = pdf.splitTextToSize(notice, contentWidth - 16);
    const boxPadding = 8;
    const boxHeight = wrapped.length * lineHeight + boxPadding * 2;
    pdf.setDrawColor(0);
    pdf.setLineWidth(1);
    pdf.rect(MARGIN_PT, y, contentWidth, boxHeight);
    // Text inside box
    let ty = y + boxPadding + 12; // initial baseline inside box
    wrapped.forEach((w) => {
      pdf.text(w, MARGIN_PT + boxPadding, ty);
      ty += lineHeight;
    });
    y += boxHeight + 20;

    // Double space before next section
    y += 20;

    // Pre-Inventory section (wrapped heading)
    sectionHeader('Pre-Inventory');

    // General information (no label)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `• ALR disk is ${client.ALR}.` : '';
    const combinedPre = [alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n');
    if (combinedPre) {
      await writeRich(combinedPre, contentWidth, lineHeight);
      y += 8;
    }

    // Area Mapping (wrapped subheading)
    const areaMapping = String(areaMappingRaw).trim();
    if (areaMapping) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      await writeRich('Area Mapping', contentWidth, 16);
      y += 16;
      checkPageBreak(lineHeight);
      y += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      await writeRich(areaMapping, contentWidth, lineHeight);
      y += 12;
    }

    // Store Prep/Instructions (wrapped subheading)
    const storePrep = String(storePrepRaw).trim();
    if (storePrep) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      await writeRich('Store Prep/Instructions', contentWidth, 16);
      y += 16;
      checkPageBreak(lineHeight);
      y += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      await writeRich(storePrep, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // INVENTORY PROCEDURES section (from Inv_Proc)
    const invProc = String(client.Inv_Proc ?? '').trim();
    if (invProc) {
      sectionHeader('INVENTORY PROCEDURES');
      await writeRich(invProc, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // AUDITS section (from Audits)
    const audits = String(client.Audits ?? '').trim();
    if (audits) {
      sectionHeader('Audits');
      await writeRich(audits, contentWidth, lineHeight);
      y += 12;
    }

    // INVENTORY FLOW section (from Inv_Flow)
    const invFlow = String(client.Inv_Flow ?? '').trim();
    if (invFlow) {
      sectionHeader('Inventory Flow');
      await writeRich(invFlow, contentWidth, lineHeight);
      y += 12;
    }

    // SPECIAL NOTES section (from Special_Notes)
    const specialNotes = String(client.Special_Notes ?? '').trim();
    if (specialNotes) {
      sectionHeader('Special Notes');
      await writeRich(specialNotes, contentWidth, lineHeight);
      y += 12;
    }

    // PRE-INVENTORY CREW INSTRUCTIONS section (from Team-Instr)
    const teamInstr = String(client['Team-Instr'] ?? '').trim();
    if (teamInstr) {
      sectionHeader('Pre-Inventory Crew Instructions');
      await writeRich(teamInstr, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // NON-COUNT PRODUCTS section (from noncount)
    const noncount = String(client.noncount ?? '').trim();
    if (noncount) {
      sectionHeader('Non-Count Products');
      await writeRich(noncount, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // REPORTS section
    const progRep = String(client.Prog_Rep ?? '').trim();
    const finalize = String(client.Finalize ?? '').trim();
    const finRep = String(client.Fin_Rep ?? '').trim();
    const processing = String(client.Processing ?? '').trim();
    
    if (progRep || finalize || finRep || processing) {
      sectionHeader('REPORTS');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      
      // Progressives subsection
      if (progRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        await writeRich('Progressives:', contentWidth, 16);
        y += 16;
        checkPageBreak(lineHeight);
        y += lineHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        await writeRich(progRep, contentWidth, lineHeight);
        y += 12;
      }
      
      // Finalizing the Count subsection
      if (finalize) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        await writeRich('Finalizing the Count:', contentWidth, 16);
        y += 16;
        checkPageBreak(lineHeight);
        y += lineHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        await writeRich(finalize, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Reports subsection
      if (finRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        await writeRich('Final Reports:', contentWidth, 16);
        y += 16;
        checkPageBreak(lineHeight);
        y += lineHeight;
        // Detect and render "Utility Reports" as bold subheader when it's the first non-empty line
        const finLines = finRep.split('\n');
        const firstNonEmptyIdx = finLines.findIndex(l => l.trim().length > 0);
        const firstLine = firstNonEmptyIdx >= 0 ? finLines[firstNonEmptyIdx].trim() : '';
        let consumedHeader = false;
        if (firstLine.toLowerCase().startsWith('utility reports')) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          await writeRich('Utility Reports:', contentWidth, 16);
          y += 16;
          checkPageBreak(lineHeight);
          y += lineHeight;
          consumedHeader = true;
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const finBody = consumedHeader ? finLines.slice(firstNonEmptyIdx + 1).join('\n') : finRep;
        await writeRich(finBody, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Processing subsection
      if (processing) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        await writeRich('Final Processing:', contentWidth, 16);
        y += 16;
        checkPageBreak(lineHeight);
        y += lineHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        await writeRich(processing, contentWidth, lineHeight);
        y += 12;
      }
    }

    // Return data URI or save; for now, trigger download with filename
    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  }

  // Native (iOS/Android via Expo): use HTML + expo-print
  const html = buildHtml(client, { logoDataUrl, qrDataUrl });
  const result = await Print.printToFileAsync({
    html,
    base64: false,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });
  return result.uri;
}

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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Instructions - ${escapeHtml(safeName)}</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          body { font-family: Helvetica, Arial, sans-serif; color: #000; }
          .header { text-align: center; }
          .header h1 { font-size: 20px; margin: 0 0 8px 0; }
          .header h2 { font-size: 18px; margin: 0 0 8px 0; }
          .header h3 { font-size: 14px; font-weight: normal; color: #666; margin: 0 0 20px 0; }
          .section { margin-top: 12px; }
          .section-title { font-size: 16px; font-weight: bold; margin: 12px 0 6px 0; }
          .info { font-size: 12px; line-height: 1.25; }
          .notice { border: 1px solid #000; padding: 8px; margin-top: 8px; font-size: 12px; }
          .rich p, .rich div { margin: 0 0 8px 0; }
          .rich ul, .rich ol { margin: 4px 0 8px 1.2em; padding: 0; }
          .rich li { margin: 2px 0; }
          .logo { width: 180px; height: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          ${qrDataUrl ? `<img class="logo" src="${qrDataUrl}" />` : ''}
          <h1>MSI Inventory</h1>
          <h2>Account Instructions:</h2>
          <h3>${escapeHtml(safeName)}</h3>
        </div>

        <div class="section">
          <div class="section-title">Client Information</div>
          <div class="info">
            <p><strong>Inventory Type:</strong> ${escapeHtml(client.inventoryType ?? '')}</p>
            <p><strong>Updated:</strong> ${escapeHtml(updatedAt)}</p>
            <p><strong>PIC:</strong> ${escapeHtml(client.PIC ?? '')}</p>
            <p><strong>Verification:</strong> ${escapeHtml(client.verification ?? '')}</p>
            <p><strong>Start Time:</strong> ${escapeHtml(client.startTime ?? '')}</p>
          </div>
          <div class="notice">"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"</div>
        </div>

        <div class="section">
          <div class="section-title">Pre-Inventory</div>
          <div class="info rich">${rich(preInv)}</div>

          ${areaMapping ? `
            <div class="subsection">
              <div class="section-title" style="font-size:14px;">Area Mapping</div>
              <div class="info rich">${rich(areaMapping)}</div>
            </div>` : ''}

          ${storePrep ? `
            <div class="subsection">
              <div class="section-title" style="font-size:14px;">Store Prep/Instructions</div>
              <div class="info rich">${rich(storePrep)}</div>
            </div>` : ''}
        </div>

        ${invProc ? `
          <div class="section">
            <div class="section-title">INVENTORY PROCEDURES</div>
            <div class="info rich">${rich(invProc)}</div>
          </div>` : ''}

        ${audits ? `
          <div class="section">
            <div class="section-title">Audits</div>
            <div class="info rich">${rich(audits)}</div>
          </div>` : ''}

        ${invFlow ? `
          <div class="section">
            <div class="section-title">Inventory Flow</div>
            <div class="info rich">${rich(invFlow)}</div>
          </div>` : ''}

        ${specialNotes ? `
          <div class="section">
            <div class="section-title">Special Notes</div>
            <div class="info rich">${rich(specialNotes)}</div>
          </div>` : ''}

        ${teamInstr ? `
          <div class="section">
            <div class="section-title">Pre-Inventory Crew Instructions</div>
            <div class="info rich">${rich(teamInstr)}</div>
          </div>` : ''}

        ${noncount ? `
          <div class="section">
            <div class="section-title">Non-Count Products</div>
            <div class="info rich">${rich(noncount)}</div>
          </div>` : ''}

        ${progRep || finalize || finRep || processing ? `
          <div class="section">
            <div class="section-title">REPORTS</div>
            <div class="info">
              ${progRep ? `
                <div class="subsection">
                  <div class="section-title" style="font-size:14px;">Progressives:</div>
                  <div class="info rich">${rich(progRep)}</div>
                </div>` : ''}

              ${finalize ? `
                <div class="subsection">
                  <div class="section-title" style="font-size:14px;">Finalizing the Count:</div>
                  <div class="info rich">${rich(finalize)}</div>
                </div>` : ''}

              ${finRep ? `
                <div class="subsection">
                  <div class="section-title" style="font-size:14px;">Final Reports:</div>
                  <div class="info rich">${rich(finRep)}</div>
                </div>` : ''}

              ${processing ? `
                <div class="subsection">
                  <div class="section-title" style="font-size:14px;">Final Processing:</div>
                  <div class="info rich">${rich(processing)}</div>
                </div>` : ''}
            </div>
          </div>` : ''}
      </body>
    </html>
  `;
}

export default function UniversalPDFGenerator() {
  // This file primarily exposes the generator function above.
  return null;
}


