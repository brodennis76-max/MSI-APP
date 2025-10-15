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

    // Convert rich HTML (from editors) to plain text for PDF
    const htmlToPlain = (html) => {
      if (!html) return '';
      let text = String(html);
      
      // Convert lists to plain text with proper formatting and indentation
      text = text
        .replace(/<\s*ul[^>]*>/gi, '')  // Remove ul opening tags
        .replace(/<\s*\/ul\s*>/gi, '')  // Remove ul closing tags
        .replace(/<\s*ol[^>]*>/gi, '')  // Remove ol opening tags
        .replace(/<\s*\/ol\s*>/gi, '')  // Remove ol closing tags
        .replace(/<\s*li\s*>/gi, '    • ')  // Convert li opening to indented bullet
        .replace(/<\s*\/li\s*>/gi, '\n') // Convert li closing to newline
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n')
        .replace(/<\s*\/div\s*>/gi, '\n')
        .replace(/<\s*h[1-6][^>]*>/gi, '')
        .replace(/<\s*\/h[1-6]\s*>/gi, '\n');
      
      // Strip disallowed tags, keep b/strong/i/em/u/br
      text = text.replace(/<(?!\/?(b|strong|i|em|u|br)\b)[^>]*>/gi, '');
      
      // Decode common HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      // Collapse excessive whitespace but keep intentional line breaks
      text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      return text.trim();
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

    const writeWrapped = (text, width, lineH) => {
      // Check if text contains HTML tags
      if (text.includes('<') && text.includes('>')) {
        // Parse HTML formatting and apply to PDF
        const parseAndWriteFormattedText = (htmlText, x, y, width, lineHeight) => {
          let currentY = y;
          let currentX = x;
          
          // Track active formatting
          let isBold = false;
          let isItalic = false;
          let isUnderline = false;
          
          // Simple HTML parser for basic formatting
          const parts = htmlText.split(/(<[^>]+>)/);
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part.startsWith('<')) {
              // Handle HTML tags
              if (part.includes('<b>') || part.includes('<strong>')) {
                isBold = true;
              } else if (part.includes('</b>') || part.includes('</strong>')) {
                isBold = false;
              } else if (part.includes('<i>') || part.includes('<em>')) {
                isItalic = true;
              } else if (part.includes('</i>') || part.includes('</em>')) {
                isItalic = false;
              } else if (part.includes('<u>')) {
                isUnderline = true;
              } else if (part.includes('</u>')) {
                isUnderline = false;
              }
            } else if (part.trim()) {
              // Determine font style based on active formatting
              let fontStyle = 'normal';
              if (isBold && isItalic) {
                fontStyle = 'bolditalic';
              } else if (isBold) {
                fontStyle = 'bold';
              } else if (isItalic) {
                fontStyle = 'italic';
              }
              
              // Render text with current formatting
              pdf.setFont('helvetica', fontStyle);
              const lines = pdf.splitTextToSize(part, width - (currentX - MARGIN_PT));
              
              lines.forEach((line, lineIndex) => {
                checkPageBreak(lineHeight);
                pdf.text(line, currentX, currentY);
                currentY += lineHeight;
                if (lineIndex === 0) currentX = MARGIN_PT; // Subsequent lines start at margin
              });
            }
          }
          
          return currentY;
        };
        
        const finalY = parseAndWriteFormattedText(text, MARGIN_PT, y, width, lineH);
        y = finalY;
      } else {
        // Plain text - use original simple approach
        const lines = pdf.splitTextToSize(text, width);
        lines.forEach((ln) => {
          checkPageBreak(lineH);
          pdf.text(ln, MARGIN_PT, y);
          y += lineH;
        });
      }
    };

    const writeWrappedWithIndent = (text, width, lineH, indentPt = 0) => {
      // Check if text contains HTML tags
      if (text.includes('<') && text.includes('>')) {
        // Parse HTML formatting and apply to PDF with indentation
        const parseAndWriteFormattedText = (htmlText, x, y, width, lineHeight, indent) => {
          let currentY = y;
          let currentX = x;
          
          // Track active formatting
          let isBold = false;
          let isItalic = false;
          let isUnderline = false;
          
          // Simple HTML parser for basic formatting
          const parts = htmlText.split(/(<[^>]+>)/);
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part.startsWith('<')) {
              // Handle HTML tags
              if (part.includes('<b>') || part.includes('<strong>')) {
                isBold = true;
              } else if (part.includes('</b>') || part.includes('</strong>')) {
                isBold = false;
              } else if (part.includes('<i>') || part.includes('<em>')) {
                isItalic = true;
              } else if (part.includes('</i>') || part.includes('</em>')) {
                isItalic = false;
              } else if (part.includes('<u>')) {
                isUnderline = true;
              } else if (part.includes('</u>')) {
                isUnderline = false;
              }
            } else if (part.trim()) {
              // Determine font style based on active formatting
              let fontStyle = 'normal';
              if (isBold && isItalic) {
                fontStyle = 'bolditalic';
              } else if (isBold) {
                fontStyle = 'bold';
              } else if (isItalic) {
                fontStyle = 'italic';
              }
              
              // Render text with current formatting
              pdf.setFont('helvetica', fontStyle);
              const lines = pdf.splitTextToSize(part, width - indent);
              
              lines.forEach((line, lineIndex) => {
                checkPageBreak(lineHeight);
                const xPos = MARGIN_PT + indent;
                pdf.text(line, xPos, currentY);
                currentY += lineHeight;
              });
            }
          }
          
          return currentY;
        };
        
        const finalY = parseAndWriteFormattedText(text, MARGIN_PT + indentPt, y, width, lineH, indentPt);
        y = finalY;
      } else {
        // Plain text - use original simple approach
        const lines = pdf.splitTextToSize(text, width - indentPt);
        lines.forEach((ln, index) => {
          checkPageBreak(lineH);
          const xPos = MARGIN_PT + indentPt;
          pdf.text(ln, xPos, y);
          y += lineH;
        });
      }
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
    const inventoryTypes = Array.isArray(client.inventoryTypes) ? client.inventoryTypes : (client.inventoryType ? [client.inventoryType] : []);
    const inventoryTypeString = inventoryTypes
      .concat((Array.isArray(client.inventoryTypes) && client.inventoryTypes.includes('financial') && client.financialPrice) ? [client.financialPrice] : [])
      .join(', ');
    const infoLines = [
      `Inventory Type: ${htmlToPlain(inventoryTypeString)}`,
      `Updated: ${updatedAt}`,
      `PIC: ${htmlToPlain(client.PIC ?? '')}`,
      `Verification: ${htmlToPlain(client.verification ?? '')}`,
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
    checkPageBreakWithContent(18, 50); // Ensure header stays with content
    writeWrapped('Pre-Inventory', contentWidth, 18);
    y += 2; // small spacer after wrapped heading

    // General information (no label)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `• ALR disk is ${client.ALR}.` : '';
    const combinedPre = htmlToPlain([alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n'));
    if (combinedPre) {
      writeWrapped(combinedPre, contentWidth, lineHeight);
      y += 8;
    }

    // Area Mapping (wrapped subheading)
    const areaMapping = htmlToPlain(String(areaMappingRaw).trim());
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
    const storePrep = htmlToPlain(String(storePrepRaw).trim());
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

    // Double space before next section
    y += 20;

    // INVENTORY PROCEDURES section (from Inv_Proc)
    const invProc = htmlToPlain(String(client.Inv_Proc ?? '').trim());
    if (invProc) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('INVENTORY PROCEDURES', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(invProc, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // AUDITS section (from Audits)
    const audits = htmlToPlain(String(client.Audits ?? '').trim());
    if (audits) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('Audits', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(audits, contentWidth, lineHeight);
      y += 12;
    }

    // INVENTORY FLOW section (from Inv_Flow)
    const invFlow = htmlToPlain(String(client.Inv_Flow ?? '').trim());
    if (invFlow) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('Inventory Flow', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(invFlow, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // DEPARTMENTS section (only when items present; format "DeptNo LABEL" sorted by DeptNo)
    const rawDepartments = String(client.Departments ?? '').trim();
    if (rawDepartments) {
      const parseDepartmentItems = (text) => {
        const items = [];
        const lines = String(text).split('\n');
        for (const ln of lines) {
          const t = ln.trim();
          if (!t.startsWith('_')) continue; // only item lines
          const parts = t.replace(/^_\s*/, '').split(/\s+/);
          if (parts.length === 0) continue;
          const last = parts[parts.length - 1];
          if (!/^\d+(?:-\d+)?$/.test(last)) continue; // require dept number
          const deptNum = parseInt(last.split('-')[0], 10);
          const label = parts.slice(0, -1).join(' ').trim().toUpperCase();
          if (!label) continue;
          items.push({ dept: deptNum, label });
        }
        return items.sort((a, b) => a.dept - b.dept);
      };

      const items = parseDepartmentItems(rawDepartments);
      if (items.length > 0) {
        const formatted = items.map(i => `${i.dept} ${i.label}`).join('\n');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        checkPageBreakWithContent(18, 50);
        writeWrapped('Departments', contentWidth, 18);
        y += 2;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeWrapped(formatted, contentWidth, lineHeight);
        y += 12;
      }
    }

    // PRE-INVENTORY CREW INSTRUCTIONS section (from Team-Instr)
    const teamInstr = htmlToPlain(String(client['Team-Instr'] ?? '').trim());
    if (teamInstr) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('Pre-Inventory Crew Instructions', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(teamInstr, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // NON-COUNT PRODUCTS section (from noncount)
    const noncount = htmlToPlain(String(client.noncount ?? '').trim());
    if (noncount) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('Non-Count Products', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(noncount, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // REPORTS section
    const progRep = htmlToPlain(String(client.Prog_Rep ?? '').trim());
    const finalize = htmlToPlain(String(client.Finalize ?? '').trim());
    const finRep = htmlToPlain(String(client.Fin_Rep ?? '').trim());
    const processing = htmlToPlain(String(client.Processing ?? '').trim());
    
    if (progRep || finalize || finRep || processing) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 100); // Ensure header stays with content
      writeWrapped('REPORTS', contentWidth, 18);
      y += 2;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      
      // Progressives subsection
      if (progRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeWrapped('Progressives:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeWrapped(progRep, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Reports subsection
      if (finRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeWrapped('Final Reports:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeWrapped(finRep, contentWidth, lineHeight);
        y += 12;
      }
      
      // Finalizing the Count subsection (moved after Final Reports)
      if (finalize) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeWrapped('Finalizing the Count:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeWrapped(finalize, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Processing subsection
      if (processing) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeWrapped('Final Processing:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeWrapped(processing, contentWidth, lineHeight);
        y += 12;
      }
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
            <p><strong>Inventory Type:</strong> ${sanitizeBasicHtml(((Array.isArray(client.inventoryTypes) ? client.inventoryTypes : (client.inventoryType ? [client.inventoryType] : []))
              .concat((Array.isArray(client.inventoryTypes) && client.inventoryTypes.includes('financial') && client.financialPrice) ? [client.financialPrice] : [])
            ).join(', '))}</p>
            <p><strong>Updated:</strong> ${escapeHtml(updatedAt)}</p>
            <p><strong>PIC:</strong> ${sanitizeBasicHtml(client.PIC ?? '')}</p>
            <p><strong>Verification:</strong> ${sanitizeBasicHtml(client.verification ?? '')}</p>
          </div>
          <div class="notice">"If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!"</div>
        </div>

        <div class="section">
          <div class="section-title">Pre-Inventory</div>
          <div class="info" style="margin-top:8px;">
            <p style="white-space:pre-wrap;">${sanitizeBasicHtml(preInv)}</p>
          </div>
          ${areaMapping ? `
              <div class="subsection" style="margin-top:8px;">
                <div class="section-title" style="font-size:14px;">Area Mapping</div>
                <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(areaMapping)}</p></div>
              </div>
            ` : ''}
          ${storePrep ? `
              <div class="subsection" style="margin-top:8px;">
                <div class="section-title" style="font-size:14px;">Store Prep/Instructions</div>
                <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(storePrep)}</p></div>
              </div>
            ` : ''}
        </div>

        ${(() => {
          const invProc = String(client.Inv_Proc ?? '').trim();
          if (!invProc) return '';
          return `
            <div class="section">
              <div class="section-title">INVENTORY PROCEDURES</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(invProc)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const audits = String(client.Audits ?? '').trim();
          if (!audits) return '';
          return `
            <div class="section">
              <div class="section-title">Audits</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(audits)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const invFlow = String(client.Inv_Flow ?? '').trim();
          if (!invFlow) return '';
          return `
            <div class="section">
              <div class="section-title">Inventory Flow</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(invFlow)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const specialNotes = String(client.Special_Notes ?? '').trim();
          if (!specialNotes) return '';
          return `
            <div class="section">
              <div class="section-title">Special Notes</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${escapeHtml(specialNotes)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const raw = String(client.Departments ?? '').trim();
          if (!raw) return '';
          const items = raw.split('\n').reduce((acc, ln) => {
            const t = ln.trim();
            if (!t.startsWith('_')) return acc;
            const parts = t.replace(/^_\s*/, '').split(/\s+/);
            if (parts.length === 0) return acc;
            const maybeNum = parts[parts.length - 1];
            if (!/^\d+(?:-\d+)?$/.test(maybeNum)) return acc; // require a number
            const deptNum = parseInt(maybeNum.split('-')[0], 10);
            const label = parts.slice(0, -1).join(' ').trim().toUpperCase();
            if (!label) return acc;
            acc.push({ dept: deptNum, label });
            return acc;
          }, []);
          if (!items.length) return '';
          items.sort((a, b) => a.dept - b.dept);
          const formatted = items.map(i => `${i.dept} ${i.label}`).join('\n');
          return `
            <div class="section">
              <div class="section-title">Departments</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${escapeHtml(formatted)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const teamInstr = String(client['Team-Instr'] ?? '').trim();
          if (!teamInstr) return '';
          return `
            <div class="section">
              <div class="section-title">Pre-Inventory Crew Instructions</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(teamInstr)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const noncount = String(client.noncount ?? '').trim();
          if (!noncount) return '';
          return `
            <div class="section">
              <div class="section-title">Non-Count Products</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(noncount)}</p>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const progRep = String(client.Prog_Rep ?? '').trim();
          const finalize = String(client.Finalize ?? '').trim();
          const finRep = String(client.Fin_Rep ?? '').trim();
          const processing = String(client.Processing ?? '').trim();
          
          if (!progRep && !finalize && !finRep && !processing) return '';
          
          return `
            <div class="section">
              <div class="section-title">REPORTS</div>
              <div class="info" style="margin-top:8px;">
                ${progRep ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Progressives:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(progRep)}</p></div>
                  </div>
                ` : ''}
                ${finRep ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Final Reports:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(finRep)}</p></div>
                  </div>
                ` : ''}
                ${finalize ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Finalizing the Count:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(finalize)}</p></div>
                  </div>
                ` : ''}
                ${processing ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Final Processing:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${sanitizeBasicHtml(processing)}</p></div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const additionalNotes = String(client.additionalNotes ?? '').trim();
          if (!additionalNotes) return '';
          return `
            <div class="section">
              <div class="section-title">Additional Notes</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(additionalNotes)}</p>
              </div>
            </div>
          `;
        })()}
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

// Allow basic formatting including lists (ul, ol, li) and inline formatting
function sanitizeBasicHtml(html) {
  if (!html) return '';
  let s = String(html);
  
  // Convert lists to plain text with proper formatting and indentation
  s = s
    .replace(/<\s*ul[^>]*>/gi, '')  // Remove ul opening tags
    .replace(/<\s*\/ul\s*>/gi, '')  // Remove ul closing tags
    .replace(/<\s*ol[^>]*>/gi, '')  // Remove ol opening tags
    .replace(/<\s*\/ol\s*>/gi, '')  // Remove ol closing tags
    .replace(/<\s*li\s*>/gi, '    • ')  // Convert li opening to indented bullet
    .replace(/<\s*\/li\s*>/gi, '\n') // Convert li closing to newline
    .replace(/<\s*\/p\s*>/gi, '\n')  // Convert p closing to newline
    .replace(/<\s*\/div\s*>/gi, '\n') // Convert div closing to newline
    .replace(/<\s*br\s*\/?>/gi, '<br>'); // Keep br tags
  
  // Strip disallowed tags, keep b/strong/i/em/u/br
  s = s.replace(/<(?!\/?(b|strong|i|em|u|br)\b)[^>]*>/gi, '');
  
  // Decode entities commonly inserted by editors
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  
  // Collapse extra blank lines
  s = s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
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


