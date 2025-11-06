import React from 'react';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

// 1 inch margins on letter size (in points: 72pt/in)
const MARGIN_PT = 72; // 1"
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

    // Render HTML with formatting to PDF
    const renderFormattedText = (html, x, maxWidth, lineHeight) => {
      if (!html) return;
      let text = String(html);
      
      // Normalize multi-line tags first
      text = text.replace(/<([^>]*?)\n([^>]*?)>/g, '<$1 $2>');
      
      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      
      // Convert block elements to newlines BEFORE stripping tags
      text = text
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/p\s*[^>]*>/gi, '\n')
        .replace(/<\s*p\s*[^>]*>/gi, '')
        .replace(/<\s*\/div\s*[^>]*>/gi, '\n')
        .replace(/<\s*div\s*[^>]*>/gi, '');
      
      // Now strip ALL non-formatting tags (keep only b, strong, i, em, u)
      // First, replace formatting tags with placeholders
      text = text
        .replace(/<\s*(b|strong)\s*[^>]*>/gi, '{{BOLD_START}}')
        .replace(/<\s*\/(b|strong)\s*>/gi, '{{BOLD_END}}')
        .replace(/<\s*(i|em)\s*[^>]*>/gi, '{{ITALIC_START}}')
        .replace(/<\s*\/(i|em)\s*>/gi, '{{ITALIC_END}}')
        .replace(/<\s*u\s*[^>]*>/gi, '{{UNDERLINE_START}}')
        .replace(/<\s*\/u\s*>/gi, '{{UNDERLINE_END}}');
      
      // Strip ALL remaining HTML tags (including all attributes)
      text = text.replace(/<[^>]+>/g, '');
      
      // Restore formatting tags
      text = text
        .replace(/{{BOLD_START}}/g, '<b>')
        .replace(/{{BOLD_END}}/g, '</b>')
        .replace(/{{ITALIC_START}}/g, '<i>')
        .replace(/{{ITALIC_END}}/g, '</i>')
        .replace(/{{UNDERLINE_START}}/g, '<u>')
        .replace(/{{UNDERLINE_END}}/g, '</u>');
      
      // Parse and render formatted text
      const parts = text.split(/(<[^>]+>)/);
      let currentX = x;
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        
        if (part.startsWith('<')) {
          // Handle formatting tags only (all other tags were stripped)
          if (part === '<b>' || part === '<strong>') {
            isBold = true;
          } else if (part === '</b>' || part === '</strong>') {
            isBold = false;
          } else if (part === '<i>' || part === '<em>') {
            isItalic = true;
          } else if (part === '</i>' || part === '</em>') {
            isItalic = false;
          } else if (part === '<u>') {
            isUnderline = true;
          } else if (part === '</u>') {
            isUnderline = false;
          }
        } else {
          // Render text with current formatting
          if (part.trim()) {
            let fontStyle = 'normal';
            if (isBold && isItalic) fontStyle = 'bolditalic';
            else if (isBold) fontStyle = 'bold';
            else if (isItalic) fontStyle = 'italic';
            
            pdf.setFont('helvetica', fontStyle);
            
            // Handle newlines and wrap text
            const lines = part.split('\n');
            let hasRenderedText = false;
            lines.forEach((line, lineIndex) => {
              if (line.trim() || (lineIndex === 0 && part.trim())) {
                const availableWidth = maxWidth - (currentX - MARGIN_PT);
                const wrappedLines = pdf.splitTextToSize(line, availableWidth);
                wrappedLines.forEach((wrappedLine, wrapIndex) => {
                  // Move to next line if not first line of first wrapped segment
                  if (wrapIndex > 0 || lineIndex > 0) {
                    checkPageBreak(lineHeight);
                    y += lineHeight;
                    currentX = MARGIN_PT;
                  }
                  pdf.text(wrappedLine, currentX, y);
                  if (isUnderline) {
                    const textWidth = pdf.getTextWidth(wrappedLine);
                    pdf.line(currentX, y + 2, currentX + textWidth, y + 2);
                  }
                  hasRenderedText = true;
                });
                // After rendering all wrapped lines for this line, move to next line
                if (lineIndex < lines.length - 1) {
                  y += lineHeight;
                  currentX = MARGIN_PT;
                } else if (wrappedLines.length > 0) {
                  // After last line, increment y for next field
                  y += lineHeight;
                }
              } else if (lineIndex < lines.length - 1) {
                // Empty line - add spacing
                checkPageBreak(lineHeight);
                y += lineHeight * 0.5;
              }
            });
            // If no text was rendered, still increment y
            if (!hasRenderedText && part.trim()) {
              y += lineHeight;
            }
          }
        }
      }
      // Ensure y is incremented after rendering (if text was rendered)
      // The y should already be incremented by the rendering logic above,
      // but if no text was rendered, we still need to move to next line
      // This is handled by the caller adding spacing
    };
    
    // Simple HTML to plain text for fields that don't need formatting
    const htmlToPlainInline = (html) => {
      if (!html) return '';
      let s = String(html);
      
      // Normalize multi-line tags
      s = s.replace(/<([^>]*?)\n([^>]*?)>/g, '<$1 $2>');
      
      // Decode HTML entities
      s = s
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      
      // Convert block elements to newlines
      s = s
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/p\s*[^>]*>/gi, '\n')
        .replace(/<\s*p\s*[^>]*>/gi, '')
        .replace(/<\s*\/div\s*[^>]*>/gi, '\n')
        .replace(/<\s*div\s*[^>]*>/gi, '');
      
      // Strip all HTML tags
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

    // Write helper: chooses formatted or plain rendering automatically
    const writeRich = (text, width, lineH) => {
      const str = String(text || '');
      const hasHtml = str.includes('<') && str.includes('>');
      if (hasHtml) {
        renderFormattedText(str, MARGIN_PT, width, lineH);
      } else {
        const lines = pdf.splitTextToSize(str, width);
        lines.forEach((ln) => {
          checkPageBreak(lineH);
          pdf.text(ln, MARGIN_PT, y);
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
      
      // Check if value has formatting tags
      const hasFormatting = value.includes('<b>') || value.includes('<strong>') || 
                           value.includes('<i>') || value.includes('<em>') || 
                           value.includes('<u>') || value.includes('<p') || 
                           value.includes('<div') || value.includes('<br');
      
      if (useFormatting && hasFormatting) {
        // Render with formatting (this will modify y)
        renderFormattedText(value, startX, maxWidth, lineHeight);
        // Add spacing after the field
        y += 2;
      } else {
        // Render as plain text
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
        }
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
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    checkPageBreakWithContent(18, 50); // Ensure header stays with content
    writeRich('Pre-Inventory', contentWidth, 18);
    y += 2; // small spacer after wrapped heading

    // General information (no label)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const { generalText, areaMappingRaw, storePrepRaw } = extractPreInventoryBundle(client.sections);
    const alrIntro = client.ALR ? `• ALR disk is ${client.ALR}.` : '';
    const combinedPre = [alrIntro, String(generalText || client.preInventory || '').trim()].filter(Boolean).join('\n');
    if (combinedPre) {
      writeRich(combinedPre, contentWidth, lineHeight);
      y += 8;
    }

    // Area Mapping (wrapped subheading)
    const areaMapping = String(areaMappingRaw).trim();
    if (areaMapping) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      writeRich('Area Mapping', contentWidth, 16);
      y += 0;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(areaMapping, contentWidth, lineHeight);
      y += 12;
    }

    // Store Prep/Instructions (wrapped subheading)
    const storePrep = String(storePrepRaw).trim();
    if (storePrep) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      writeRich('Store Prep/Instructions', contentWidth, 16);
      y += 0;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(storePrep, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // INVENTORY PROCEDURES section (from Inv_Proc)
    const invProc = String(client.Inv_Proc ?? '').trim();
    if (invProc) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeRich('INVENTORY PROCEDURES', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(invProc, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // AUDITS section (from Audits)
    const audits = String(client.Audits ?? '').trim();
    if (audits) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeRich('Audits', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(audits, contentWidth, lineHeight);
      y += 12;
    }

    // INVENTORY FLOW section (from Inv_Flow)
    const invFlow = String(client.Inv_Flow ?? '').trim();
    if (invFlow) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeRich('Inventory Flow', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(invFlow, contentWidth, lineHeight);
      y += 12;
    }

    // SPECIAL NOTES section (from Special_Notes)
    const specialNotes = String(client.Special_Notes ?? '').trim();
    if (specialNotes) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50);
      writeWrapped('Special Notes', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(specialNotes, contentWidth, lineHeight);
      y += 12;
    }

    // PRE-INVENTORY CREW INSTRUCTIONS section (from Team-Instr)
    const teamInstr = String(client['Team-Instr'] ?? '').trim();
    if (teamInstr) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeRich('Pre-Inventory Crew Instructions', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(teamInstr, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // NON-COUNT PRODUCTS section (from noncount)
    const noncount = String(client.noncount ?? '').trim();
    if (noncount) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeRich('Non-Count Products', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeRich(noncount, contentWidth, lineHeight);
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
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 100); // Ensure header stays with content
      writeRich('REPORTS', contentWidth, 18);
      y += 2;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      
      // Progressives subsection
      if (progRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeRich('Progressives:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeRich(progRep, contentWidth, lineHeight);
        y += 12;
      }
      
      // Finalizing the Count subsection
      if (finalize) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeRich('Finalizing the Count:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeRich(finalize, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Reports subsection
      if (finRep) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeRich('Final Reports:', contentWidth, 16);
        y += 0;
        // Detect and render "Utility Reports" as bold subheader when it's the first non-empty line
        const finLines = finRep.split('\n');
        const firstNonEmptyIdx = finLines.findIndex(l => l.trim().length > 0);
        const firstLine = firstNonEmptyIdx >= 0 ? finLines[firstNonEmptyIdx].trim() : '';
        let consumedHeader = false;
        if (firstLine.toLowerCase().startsWith('utility reports')) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          writeWrapped('Utility Reports:', contentWidth, 16);
          y += 0;
          consumedHeader = true;
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const finBody = consumedHeader ? finLines.slice(firstNonEmptyIdx + 1).join('\n') : finRep;
        writeRich(finBody, contentWidth, lineHeight);
        y += 12;
      }
      
      // Final Processing subsection
      if (processing) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        writeRich('Final Processing:', contentWidth, 16);
        y += 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        writeRich(processing, contentWidth, lineHeight);
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

        ${(() => {
          const invProc = String(client.Inv_Proc ?? '').trim();
          if (!invProc) return '';
          return `
            <div class="section">
              <div class="section-title">INVENTORY PROCEDURES</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${escapeHtml(invProc)}</p>
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
                <p style="white-space:pre-wrap;">${escapeHtml(audits)}</p>
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
                <p style="white-space:pre-wrap;">${escapeHtml(invFlow)}</p>
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
          const teamInstr = String(client['Team-Instr'] ?? '').trim();
          if (!teamInstr) return '';
          return `
            <div class="section">
              <div class="section-title">Pre-Inventory Crew Instructions</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${escapeHtml(teamInstr)}</p>
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
                <p style="white-space:pre-wrap;">${escapeHtml(noncount)}</p>
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
                    <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(progRep)}</p></div>
                  </div>
                ` : ''}
                ${finalize ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Finalizing the Count:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(finalize)}</p></div>
                  </div>
                ` : ''}
                ${finRep ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Final Reports:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(finRep)}</p></div>
                  </div>
                ` : ''}
                ${processing ? `
                  <div class="subsection" style="margin-top:8px;">
                    <div class="section-title" style="font-size:14px;">Final Processing:</div>
                    <div class="info"><p style="white-space:pre-wrap;">${escapeHtml(processing)}</p></div>
                  </div>
                ` : ''}
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


