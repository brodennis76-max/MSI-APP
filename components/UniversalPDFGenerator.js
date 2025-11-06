// UniversalPDFGenerator.js

import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// Page metrics in points
const MARGIN_PT = 72;
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

// DOM guards for web and SSR safety
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
const SHOW_ELEMENT = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_ELEMENT : 1;

// Allowed tags for sanitized rich content
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
      // strip attributes (only keep <img src="data:image/...">)
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

  // Native fallback (conservative)
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

// ---------- Small utils ----------

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
    fr.onload = () => resolve(fr.result); // data:image/...;base64,....
    fr.readAsDataURL(blob);
  });
}

function encodePathPreserveSlashes(p) {
  return String(p || '').split('/').map(encodeURIComponent).join('/');
}

// Try jsDelivr then raw.githubusercontent.com to get a Data URL
async function getRepoImageDataUrl(relPath, assetBase) {
  const path = encodePathPreserveSlashes(relPath);
  const bases = [
    assetBase || DEFAULT_JSDELIVR_BASE,
    RAW_BASE
  ];
  for (const base of bases) {
    try {
      const url = `${base}/${path}`;
      return await fetchAsDataURL(url);
    } catch { /* try next */ }
  }
  throw new Error('All repo image fetch attempts failed');
}

// ---------- Web HTML -> jsPDF renderer (spacing + list fixes) ----------

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
    const style =
      ctx.bold && ctx.italic ? 'bolditalic' :
      ctx.bold ? 'bold' :
      ctx.italic ? 'italic' : 'normal';
    pdf.setFont('helvetica', style);
    pdf.setFontSize(baseFontSize);

    const lines = pdf.splitTextToSize(text, width);
    lines.forEach((ln, idx) => {
      if (idx > 0) { checkPage(lineHeight); y += lineHeight; }
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
    } catch { /* ignore */ }
  };

  const renderNode = async (node, ctx, indent) => {
    // TEXT_NODE: preserve hard line breaks
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

    // ----- NO lead-in spacing for <p> or <div> -----
    // (spacing is now added *outside* the renderer, after headers)

    if (tag === 'b' || tag === 'strong') ctx.bold = true;
    if (tag === 'i' || tag === 'em') ctx.italic = true;
    if (tag === 'u') ctx.underline = true;

    if (tag === 'ul' || tag === 'ol') {
      // list should always start on a clean new body line
      checkPage(lineHeight);
      y += lineHeight;

      let index = 1;
      const items = Array.from(node.children).filter(el => el.tagName.toLowerCase() === 'li');
      for (const li of items) {
        // each bullet starts on a fresh line
        checkPage(lineHeight);
        y += lineHeight;

        const marker = tag === 'ul' ? '•' : `${index}.`;
        const markerX = margin + indent;
        const contentX = markerX + bulletIndent;
        const width = pageWidth - margin - contentX;

        pdf.setFont('helvetica','normal');
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
      // small space after whole list
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

    // generic element
    for (const child of node.childNodes) {
      const snap = { ...ctx };
      await renderNode(child, snap, indent);
    }

    // tiny gap after paragraphs improves readability
    if (tag === 'p') { checkPage(lineHeight); y += 2; }
  };

  return {
    getY: () => y,
    setY: v => { y = v; },
    async renderHtmlString(html, indentPx = 0) {
      if (!HAS_DOM) return;
      const clean = sanitizeHtmlSubset(html);
      const container = document.createElement('div');
      container.innerHTML = clean;
      for (const n of container.childNodes) {
        await renderNode(n, { bold: false, italic: false, underline: false }, indentPx);
      }
    }
  };
}

// ---------- Data helpers ----------

function formatUpdatedAt(val) {
  try {
    if (!val) return '';
    const date = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
    return date.toLocaleDateString('en-US');
  } catch {
    return '';
  }
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
    return {
      generalText,
      areaMappingRaw: findSub('Area Mapping'),
      storePrepRaw: findSub('Store Prep Instructions')
    };
  }
  return empty;
}

// ---------- Native HTML builder ----------

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
          .header h3 { font-size: 14px; font-weight: normal; color: #666; margin: 0 0 12px 0; }
          .row { display: flex; justify-content: center; gap: 16px; align-items: center; margin-bottom: 6px; }
          .logo { width: 180px; height: auto; }
          .qr { width: 120px; height: auto; }
          .section { margin-top: 12px; }
          .section-title { font-size: 16px; font-weight: bold; margin: 12px 0 6px 0; }
          .info { font-size: 12px; line-height: 1.25; }
          .notice { border: 1px solid #000; padding: 8px; margin-top: 8px; font-size: 12px; }
          .rich p, .rich div { margin: 0 0 8px 0; }
          .rich ul, .rich ol { margin: 4px 0 8px 1.2em; padding: 0; }
          .rich li { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="row">
            ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ''}
            ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" />` : ''}
          </div>
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

// ---------- Main entry ----------

export async function generateAccountInstructionsPDF(options) {
  const { clientId, clientData } = options || {};

  // Load client
  let client = clientData;
  if (!client && clientId) {
    const ref = doc(db, 'clients', clientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Client not found');
    client = { id: snap.id, ...snap.data() };
  }
  if (!client) throw new Error('Missing client data');

  // Resolve assets (logo + QR)
  const assetBase = client.assetBase || DEFAULT_JSDELIVR_BASE;

  let logoDataUrl = '';
  if (client.logoDataUrl && /^data:image\//i.test(client.logoDataUrl)) {
    logoDataUrl = client.logoDataUrl;
  } else if (client.logoUrl) {
    try { logoDataUrl = await fetchAsDataURL(client.logoUrl); } catch { logoDataUrl = ''; }
  }

  const qrPath = client.qrPath || 'qr-codes/1450 Scanner Program.png';
  let qrDataUrl = '';
  try { qrDataUrl = await getRepoImageDataUrl(qrPath, assetBase); } catch { qrDataUrl = ''; }

  if (Platform.OS === 'web') {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });

    let y = MARGIN_PT;
    const checkPageBreak = (advance) => {
      if (y + advance > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
      }
    };
    const checkPageBreakWithContent = (headerHeight, contentHeight) => {
      if (y + headerHeight + contentHeight > PAGE_HEIGHT_PT - MARGIN_PT &&
          y + headerHeight + 30 > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
      }
    };

    const htmlRenderer = createHtmlRenderer(pdf, {
      pageWidth: PAGE_WIDTH_PT,
      pageHeight: PAGE_HEIGHT_PT,
      margin: MARGIN_PT,
      lineHeight: 14,
      baseFontSize: 12
    });

    // Optional header images
    if (logoDataUrl) {
      try {
        const type = /^data:image\/jpeg/i.test(logoDataUrl) ? 'JPEG' : 'PNG';
        pdf.addImage(logoDataUrl, type, MARGIN_PT, y - 40, 120, 36);
      } catch {}
    }
    if (qrDataUrl) {
      try {
        const type = /^data:image\/jpeg/i.test(qrDataUrl) ? 'JPEG' : 'PNG';
        const qrW = 120;
        const xImg = PAGE_WIDTH_PT - MARGIN_PT - qrW;
        const yTop = MARGIN_PT;
        pdf.addImage(qrDataUrl, type, xImg, yTop, qrW, qrW);
      } catch {}
    }

    // Header text
    const headerLines = [
      'MSI Inventory',
      'Account Instructions:',
      client.name || client.id || 'Unknown Client'
    ];
    headerLines.forEach((text, i) => {
      if (i < 2) {
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
      } else {
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(102, 102, 102);
      }
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
    const lineHeight = 14;

    // ---------- Helper: main section header ----------
    const sectionHeader = (title) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50);
      pdf.text(title, MARGIN_PT, y);
      y += 18;               // header line height
      y += 8;                // FIX: gap after header
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    // ---------- Helper: subsection header ----------
    const subSectionHeader = (title) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      checkPageBreakWithContent(16, 40);
      pdf.text(title, MARGIN_PT, y);
      y += 16;
      y += 6;                // FIX: smaller gap for subsections
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
    };

    // Client Information (with guaranteed separation)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    checkPageBreakWithContent(20, 100);
    pdf.text('Client Information', MARGIN_PT, y);
    y += 18 + 8; // header + gap

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12);
    const updatedAt = formatUpdatedAt(client.updatedAt);

    const renderKV = (label, value) => {
      if (!value) return;
      const labelText = `${label}: `;
      checkPageBreak(lineHeight);
      const labelWidth = pdf.getTextWidth(labelText);
      pdf.text(labelText, MARGIN_PT, y);

      const startX = MARGIN_PT + labelWidth;
      const maxWidth = contentWidth - labelWidth;
      const lines = pdf.splitTextToSize(String(value), maxWidth);
      lines.forEach((ln, idx) => {
        if (idx > 0) { checkPageBreak(lineHeight); y += lineHeight; }
        pdf.text(ln, startX, y);
      });
      y += lineHeight;
    };

    if (client.inventoryType) renderKV('Inventory Type', String(client.inventoryType));
    if (updatedAt) { checkPageBreak(lineHeight); pdf.text(`Updated: ${updatedAt}`, MARGIN_PT, y); y += lineHeight; }
    if (client.PIC) renderKV('PIC', String(client.PIC));
    if (client.verification) renderKV('Verification', String(client.verification));
    if (client.startTime) renderKV('Start Time', String(client.startTime));
    y += 8;

    // Notice box
    const notice = '"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"';
    const wrapped = pdf.splitTextToSize(notice, contentWidth - 16);
    const boxPadding = 8;
    const boxHeight = wrapped.length * lineHeight + boxPadding * 2;
    pdf.setDrawColor(0); pdf.setLineWidth(1);
    pdf.rect(MARGIN_PT, y, contentWidth, boxHeight);
    let ty = y + boxPadding + 12;
    wrapped.forEach(w => { pdf.text(w, MARGIN_PT + boxPadding, ty); ty += lineHeight; });
    y += boxHeight + 20;

    // ---------- Pre-Inventory ----------
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `• ALR disk is ${client.ALR}.` : '';
    const combinedPre = [alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n');

    if (combinedPre || areaMappingRaw || storePrepRaw) {
      sectionHeader('Pre-Inventory');

      if (combinedPre) {
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(combinedPre);
        y = htmlRenderer.getY() + 8;
      }

      if (String(areaMappingRaw).trim()) {
        subSectionHeader('Area Mapping');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(String(areaMappingRaw));
        y = htmlRenderer.getY() + 10;
      }

      if (String(storePrepRaw).trim()) {
        subSectionHeader('Store Prep/Instructions');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(String(storePrepRaw));
        y = htmlRenderer.getY() + 10;
      }

      y += 8;
    }

    // ---------- Generic rich sections ----------
    const writeRichSection = async (title, body) => {
      const text = String(body || '').trim();
      if (!text) return;
      sectionHeader(title);
      htmlRenderer.setY(y);
      await htmlRenderer.renderHtmlString(text);
      y = htmlRenderer.getY() + 12;
    };

    await writeRichSection('INVENTORY PROCEDURES', client.Inv_Proc);
    await writeRichSection('Audits', client.Audits);
    await writeRichSection('Inventory Flow', client.Inv_Flow);
    await writeRichSection('Special Notes', client.Special_Notes);
    await writeRichSection('Pre-Inventory Crew Instructions', client['Team-Instr']);
    await writeRichSection('Non-Count Products', client.noncount);

    // ---------- Reports ----------
    const progRep = String(client.Prog_Rep ?? '').trim();
    const finalize = String(client.Finalize ?? '').trim();
    const finRep = String(client.Fin_Rep ?? '').trim();
    const processing = String(client.Processing ?? '').trim();

    if (progRep || finalize || finRep || processing) {
      sectionHeader('REPORTS');

      if (progRep) {
        subSectionHeader('Progressives:');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(progRep);
        y = htmlRenderer.getY() + 12;
      }
      if (finalize) {
        subSectionHeader('Finalizing the Count:');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(finalize);
        y = htmlRenderer.getY() + 12;
      }
      if (finRep) {
        subSectionHeader('Final Reports:');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(finRep);
        y = htmlRenderer.getY() + 12;
      }
      if (processing) {
        subSectionHeader('Final Processing:');
        htmlRenderer.setY(y);
        await htmlRenderer.renderHtmlString(processing);
        y = htmlRenderer.getY() + 12;
      }
    }

    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  }

  // Native: expo-print with rich HTML and embedded images
  const { printToFileAsync } = await import('expo-print');
  const html = buildHtml(client, { logoDataUrl, qrDataUrl });
  const result = await printToFileAsync({
    html,
    base64: false,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT
  });
  return result.uri;
}

export default function UniversalPDFGenerator() {
  return null;
}
