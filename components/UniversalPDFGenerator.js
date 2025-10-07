import React from 'react';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// 0.5 inch margins on letter size (in points: 72pt/in)
const MARGIN_PT = 36; // 0.5"
const PAGE_WIDTH_PT = 612; // 8.5" * 72
const PAGE_HEIGHT_PT = 792; // 11" * 72

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

  if (Platform.OS === 'web') {
    // Web: use jsPDF
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });

    // Compute centered header lines
    const headerLines = [
      'MSI Inventory',
      'Account Instructions:',
      client.name || client.id || 'Unknown Client'
    ];

    pdf.setFont('helvetica', 'bold');
    let y = MARGIN_PT;
    const checkPageBreak = (advance) => {
      if (y + advance > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
      }
    };

    const writeWrapped = (text, width, lineH) => {
      const lines = pdf.splitTextToSize(text, width);
      lines.forEach((ln) => {
        checkPageBreak(lineH);
        pdf.text(ln, MARGIN_PT, y);
        y += lineH;
      });
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
    pdf.text('Client Information', MARGIN_PT, y);
    y += 20;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const updatedAt = formatUpdatedAt(client.updatedAt);
    const infoLines = [
      `Inventory Type: ${client.inventoryType ?? ''}`,
      `Updated: ${updatedAt}`,
      `PIC: ${client.PIC ?? ''}`,
      `Verification: ${client.verification ?? ''}`,
    ];
    const lineHeight = 14;
    infoLines.forEach((line) => {
      checkPageBreak(lineHeight);
      pdf.text(line, MARGIN_PT, y);
      y += lineHeight;
    });
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
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    writeWrapped('Pre-Inventory', contentWidth, 18);
    y += 2; // small spacer after wrapped heading

    // General information (no label)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `• ALR disk is ${client.ALR}.` : '';
    const combinedPre = [alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n');
    if (combinedPre) {
      writeWrapped(combinedPre, contentWidth, lineHeight);
      y += 8;
    }

    // Area Mapping (wrapped subheading)
    const areaMapping = String(areaMappingRaw).trim();
    if (areaMapping) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      writeWrapped('Area Mapping', contentWidth, 16);
      y += 0;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(areaMapping, contentWidth, lineHeight);
      y += 12;
    }

    // Store Prep/Instructions (wrapped subheading)
    const storePrep = String(storePrepRaw).trim();
    if (storePrep) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      writeWrapped('Store Prep/Instructions', contentWidth, 16);
      y += 0;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(storePrep, contentWidth, lineHeight);
      y += 12;
    }

    // Return data URI or save; for now, trigger download with filename
    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  }

  // Native (iOS/Android via Expo): use HTML + expo-print
  const html = buildHtml(client);
  const result = await Print.printToFileAsync({
    html,
    base64: false,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });
  return result.uri;
}

function buildHtml(client) {
  const safeName = client.name || client.id || 'Unknown Client';
  const updatedAt = formatUpdatedAt(client.updatedAt);
  const extracted = extractPreInventoryBundle(client.sections);
  const preInv = String(extracted.generalText || client.preInventory || '').trim();
  const areaMapping = String(extracted.areaMappingRaw).trim();
  const storePrep = String(extracted.storePrepRaw).trim();
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Instructions - ${escapeHtml(safeName)}</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          body { font-family: Helvetica, Arial, sans-serif; margin: 0; color: #000; }
          .header { text-align: center; }
          .header h1 { font-size: 20px; margin: 0 0 8px 0; }
          .header h2 { font-size: 18px; margin: 0 0 8px 0; }
          .header h3 { font-size: 14px; font-weight: normal; color: #666666; margin: 0 0 20px 0; }
          .section { margin-top: 8px; }
          .section-title { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; }
          .info p { margin: 4px 0; font-size: 12px; }
          .notice { border: 1px solid #000; padding: 8px; margin-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
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
          <div class="info" style="margin-top:8px;">
            <p style="white-space:pre-wrap;">${escapeHtml(preInv)}</p>
          </div>
          ${areaMapping ? `
              <div class="subsection" style="margin-top:8px;">
                <div class="section-title" style="font-size:14px;">Area Mapping</div>
                <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(areaMapping)}</p></div>
              </div>
            ` : ''}
          ${storePrep ? `
              <div class="subsection" style="margin-top:8px;">
                <div class="section-title" style="font-size:14px;">Store Prep/Instructions</div>
                <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(storePrep)}</p></div>
              </div>
            ` : ''}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function UniversalPDFGenerator() {
  // This file primarily exposes the generator function above.
  return null;
}

function formatUpdatedAt(val) {
  try {
    if (!val) return '';
    // Firestore Timestamp support
    const date = typeof val.toDate === 'function' ? val.toDate() : new Date(val);
    return date.toLocaleDateString('en-US');
  } catch {
    return '';
  }
}

// Resolve section texts from either a map object or an array of entries
function extractPreInventoryBundle(sections) {
  // Returns { generalText, areaMappingRaw, storePrepRaw }
  const empty = { generalText: '', areaMappingRaw: '', storePrepRaw: '' };
  if (!sections) return empty;
  // Map form not expected for nested subsections, but support minimal keys
  if (typeof sections === 'object' && !Array.isArray(sections)) {
    return {
      generalText: sections['Pre-Inventory'] ?? '',
      areaMappingRaw: sections['Area Mapping'] ?? '',
      storePrepRaw: sections['Store Prep Instructions'] ?? ''
    };
  }
  if (Array.isArray(sections)) {
    const pre = sections.find(s => (s?.sectionName || '').toString().toLowerCase() === 'pre-inventory'.toLowerCase());
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


