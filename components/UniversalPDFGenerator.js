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
        .replace(/<\s*li\s*>/gi, '• ')  // Convert li opening to bullet (no extra spaces)
        .replace(/<\s*\/li\s*>/gi, '\n') // Convert li closing to newline
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n')
        .replace(/<\s*\/div\s*>/gi, '\n')
        .replace(/<\s*h[1-6][^>]*>/gi, '')
        .replace(/<\s*\/h[1-6]\s*>/gi, '\n');
      
      // Strip all HTML tags except basic formatting, but remove all attributes
      text = text.replace(/<(\/?)(b|strong|i|em|u|br)(?:\s[^>]*)?>/gi, '<$1$2>');
      text = text.replace(/<(?!\/?(b|strong|i|em|u|br)\b)[^>]*>/gi, '');
      
      // Fix malformed nested tags like <b><b></b><i>text</i></b>
      text = text.replace(/<b>\s*<b>\s*<\/b>\s*<i>/gi, '<i><b>');
      text = text.replace(/<\/i>\s*<\/b>/gi, '</b></i>');
      text = text.replace(/<b>\s*<b>/gi, '<b>');
      text = text.replace(/<\/b>\s*<\/b>/gi, '</b>');
      text = text.replace(/<i>\s*<i>/gi, '<i>');
      text = text.replace(/<\/i>\s*<\/i>/gi, '</i>');
      // Remove empty formatting tags
      text = text.replace(/<(b|strong|i|em|u)>\s*<\/\1>/gi, '');
      // Collapse immediate close-open boundaries (prevents mid-sentence splits like </b></i><i><b>)
      text = text.replace(/<\/(b|strong|i|em|u)>\s*<\1>/gi, '');
      // Run twice to handle cross-pairs like </b></i><i><b>
      text = text.replace(/<\/(b|strong|i|em|u)>\s*<\1>/gi, '');
      
      // Decode common HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      
      // Collapse excessive whitespace but keep intentional double line breaks
      text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      
      // Detect and split concatenated number patterns BEFORE line processing
      // This handles cases like "Report120 Area" -> "Report\n120 Area"
      // Pattern: complete word followed by number then space and capital letter
      text = text.replace(/([A-Za-z]+)(\d+\s+[A-Z])/g, '$1\n$2');
      // Also handle cases with no space: "Report120Area" -> "Report\n120 Area"
      // Match word followed by number then capital letter directly
      text = text.replace(/([A-Za-z]+)(\d+)([A-Z])/g, '$1\n$2 $3');
      
      // Detect and split numbered list items that come after text
      // Pattern: text ending with colon/punctuation followed by space and "1. " (numbered list)
      // Example: "followed: 1. Shirts..." -> "followed:\n1. Shirts..."
      text = text.replace(/([:\.,;])\s+(\d+\.\s)/g, '$1\n$2');
      
      // Also handle cases where the pattern might be on a single line that needs splitting
      // This catches any remaining instances where numbered lists follow text
      text = text.replace(/([A-Za-z][:\.,;])\s+(\d+\.\s)/g, '$1\n$2');
      
      // More general: catch any text (word ending) followed by space and numbered list
      // This ensures "followed 1. item" or "text 1. item" gets split
      // Only apply if not already at start of line or after punctuation
      text = text.replace(/([A-Za-z])\s+(\d+\.\s)/g, '$1\n$2');
      
      // Preserve newlines that are likely list items or intentional breaks
      // Only collapse newlines that are clearly soft wraps (mid-paragraph continuation)
      const lines = text.split('\n');
      const preservedLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        
        // Always preserve empty lines (double line breaks)
        if (trimmed.length === 0) {
          preservedLines.push('\n');
          continue;
        }
        
        // Check if line contains text ending with punctuation followed by numbered list
        // Example: "followed: 1. Shirts..." needs to be split
        if (/([:\.,;])\s+(\d+\.\s)/.test(trimmed)) {
          // Split the line at the punctuation + numbered list boundary
          const parts = trimmed.split(/([:\.,;])\s+(\d+\.\s)/);
          if (parts.length >= 3) {
            // First part is text before punctuation, then punctuation, then numbered list and rest
            const beforePunct = parts[0] + parts[1]; // text + punctuation
            const numberedPart = parts.slice(2).join(''); // numbered list + rest of line
            preservedLines.push(beforePunct + '\n');
            preservedLines.push(numberedPart + '\n');
            continue;
          }
        }
        
        // Check if line contains numbered list in the middle (not at start)
        // Example: "text 1. item" needs to be split to "text\n1. item"
        // This catches cases where numbered lists appear mid-line
        if (/\s+(\d+\.\s)/.test(trimmed) && !/^\d+\.\s/.test(trimmed)) {
          // Find the first numbered list pattern and split before it
          const match = trimmed.match(/\s+(\d+\.\s)/);
          if (match && match.index > 0) {
            const beforeNumber = trimmed.substring(0, match.index).trim();
            const numberedPart = trimmed.substring(match.index).trim();
            if (beforeNumber && numberedPart) {
              preservedLines.push(beforeNumber + '\n');
              preservedLines.push(numberedPart + '\n');
              continue;
            }
          }
        }
        
        // Always preserve lines with bullets or numbers - add newline after
        // Check for numbered lists (1. item) or number + text patterns (110 Category Report)
        if (trimmed.startsWith('• ') || /^\d+\.\s/.test(trimmed) || /^\d+\s+[A-Z]/.test(trimmed)) {
          preservedLines.push(line + '\n');
          continue;
        }
        
        // Preserve newline if next line looks like a list item:
        // - Starts with capital letter (likely list item)
        // - Starts with a number followed by text (like "110 Category Report")
        // - Starts with numbered list (like "1. item")
        // - Is short (likely list item - less than 60 chars)
        // - Current line ends with punctuation (end of sentence/thought, including colon)
        if (nextLine && (nextLine.length === 0 || 
                        /^[A-Z]/.test(nextLine) || 
                        /^\d+\s+[A-Z]/.test(nextLine) ||
                        /^\d+\.\s/.test(nextLine) ||
                        (nextLine.length < 60 && nextLine.length > 0) ||
                        /[.!?:]$/.test(trimmed))) {
          preservedLines.push(line + '\n');
        } else if (i < lines.length - 1 && lines[i + 1].trim().length > 0) {
          // Collapse soft wrap: add space instead of newline
          preservedLines.push(line + ' ');
        } else {
          // Last line or no next line - preserve with newline
          preservedLines.push(line + '\n');
        }
      }
      text = preservedLines.join('');
      
      // Fix any malformed bullet points that might have been created
      text = text.replace(/\s+•\s+/g, '\n• ');
      text = text.replace(/•\s*•/g, '•');
      
      // Ensure text starting with bullet point has proper newline before it
      // This handles cases where text starts directly with a bullet without preceding content
      const trimmed = text.trim();
      if (trimmed.startsWith('• ') && !text.match(/^\s*\n/)) {
        // If text starts with bullet (after whitespace) but doesn't have a newline before it,
        // add a newline to ensure it starts on its own line
        text = '\n' + trimmed;
      } else {
        // Don't trim if we just added a newline - preserve leading whitespace/newlines
        text = trimmed;
      }
      
      // Don't trim final result - preserve leading newlines for proper formatting
      // Only trim trailing whitespace
      return text.replace(/\s+$/, '');
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

    // Helper: render a string with inline <b>/<i>/<u> formatting and wrapping
    const renderInlineFormatted = (htmlText, x, maxWidth, lineHeight, keepIndent = false) => {
      let currentX = x;
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;
      const parts = htmlText.split(/(<[^>]+>)/);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        if (part.startsWith('<')) {
          if (/^<\s*(b|strong)\s*>/i.test(part)) isBold = true;
          else if (/^<\s*\/(b|strong)\s*>/i.test(part)) isBold = false;
          else if (/^<\s*(i|em)\s*>/i.test(part)) isItalic = true;
          else if (/^<\s*\/(i|em)\s*>/i.test(part)) isItalic = false;
          else if (/^<\s*u\s*>/i.test(part)) isUnderline = true;
          else if (/^<\s*\/u\s*>/i.test(part)) isUnderline = false;
        } else if (part.trim()) {
          let fontStyle = 'normal';
          if (isBold && isItalic) fontStyle = 'bolditalic';
          else if (isBold) fontStyle = 'bold';
          else if (isItalic) fontStyle = 'italic';
          pdf.setFont('helvetica', fontStyle);
          const lines = pdf.splitTextToSize(part, maxWidth - (currentX - MARGIN_PT));
          lines.forEach((line, lineIndex) => {
            checkPageBreak(lineHeight);
            pdf.text(line, currentX, y);
            y += lineHeight;
            if (!keepIndent && lineIndex === 0) currentX = MARGIN_PT; // subsequent lines back to margin unless keeping indent
          });
        }
      }
    };

    const writeWrapped = (text, width, lineH) => {

      // Check if text contains bullet points or numbered lists (only at start of lines)
      // Also check for number + text patterns like "110 Category Report"
      const hasBulletPoints = text.split('\n').some(line => line.trim().startsWith('• '));
      const hasNumberedLists = text.split('\n').some(line => /^\d+\.\s/.test(line.trim()));
      const hasNumberPatterns = text.split('\n').some(line => /^\d+\s+[A-Z]/.test(line.trim()));
      
      if (hasBulletPoints || hasNumberedLists || hasNumberPatterns) {
        // Handle bullet points and numbered lists with hanging indents
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('• ') || /^\d+\.\s/.test(trimmedLine) || /^\d+\s+[A-Z]/.test(trimmedLine)) {
            // This is a bullet point or numbered list line
            let prefix = '';
            let contentText = '';
            
            if (trimmedLine.startsWith('• ')) {
              prefix = '• ';
              contentText = trimmedLine.substring(2);
            } else {
              // Numbered list - extract number and content
              let match = trimmedLine.match(/^(\d+\.\s)(.*)/);
              if (match) {
                prefix = match[1];
                contentText = match[2];
              } else {
                // Number pattern like "110 Category Report" - extract number and space
                match = trimmedLine.match(/^(\d+\s+)(.*)/);
                if (match) {
                  prefix = match[1];
                  contentText = match[2];
                } else {
                  // Fallback: treat entire line as content
                  contentText = trimmedLine;
                }
              }
            }
            
            // Calculate proper indentation
            const prefixWidth = pdf.getTextWidth(prefix);
            const hangingIndent = prefixWidth + 10; // 10pt space after prefix
            
            // Split the content text
            const textLines = pdf.splitTextToSize(contentText, width - hangingIndent);
            
            textLines.forEach((textLine, lineIndex) => {
              checkPageBreak(lineH);
              if (lineIndex === 0) {
                // First line: show prefix + text
                pdf.text(prefix, MARGIN_PT, y);
                pdf.text(textLine, MARGIN_PT + prefixWidth, y);
              } else {
                // Wrapped lines: indent to align with content
                pdf.text(textLine, MARGIN_PT + hangingIndent, y);
              }
              y += lineH;
            });
          } else if (trimmedLine.length === 0) {
            // Empty line - add small spacing for visual separation
            // Only add spacing if it's between content (not at start/end)
            if (index > 0 && index < lines.length - 1) {
              y += lineH * 0.3;
            }
          } else if (line.trim()) {
            // Regular line: if it contains inline HTML, render with formatting; else wrap as plain
            if (line.includes('<') && line.includes('>')) {
              renderInlineFormatted(line, MARGIN_PT, width, lineH, false);
            } else {
              const wrappedLines = pdf.splitTextToSize(line, width);
              wrappedLines.forEach((wrappedLine) => {
                checkPageBreak(lineH);
                pdf.text(wrappedLine, MARGIN_PT, y);
                y += lineH;
              });
            }
          }
        });
      } else if (text.includes('<') && text.includes('>')) {
        // Parse HTML formatting and apply to PDF
        const parseAndWriteFormattedText = (htmlText, x, width, lineHeight) => {
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
                pdf.text(line, currentX, y);
                y += lineHeight;
                if (lineIndex === 0) currentX = MARGIN_PT; // Subsequent lines start at margin
              });
            }
          }
        };
        
        parseAndWriteFormattedText(text, MARGIN_PT, width, lineH);
      } else {
        // Plain text - preserve explicit newlines and wrap each line
        const inputLines = text.split('\n');
        inputLines.forEach((inputLine) => {
          if (inputLine.trim().length === 0) {
            // Empty line - add spacing
            y += lineH * 0.5;
            return;
          }
          // Wrap each line to fit width
          const wrappedLines = pdf.splitTextToSize(inputLine, width);
          wrappedLines.forEach((wrappedLine) => {
            checkPageBreak(lineH);
            pdf.text(wrappedLine, MARGIN_PT, y);
            y += lineH;
          });
        });
      }
    };

    const writeWrappedWithIndent = (text, width, lineH, indentPt = 0) => {
      // Check if text contains HTML tags
      if (text.includes('<') && text.includes('>')) {
        // Use shared inline formatter honoring the indent
        const xPos = MARGIN_PT + indentPt;
        renderInlineFormatted(text, xPos, width - indentPt, lineH, true);
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
    console.log('🔍 Content width calculation:', PAGE_WIDTH_PT, '- (2 *', MARGIN_PT, ') =', contentWidth);
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
    const lineHeight = 14;

    // Helper to write key/value lines with hanging indent wrapping
    const writeKeyValue = (keyLabel, valueText) => {
      const label = `${keyLabel}: `;
      const value = String(valueText || '').trim();
      const labelWidth = pdf.getTextWidth(label);
      const available = contentWidth - labelWidth;
      const wrappedVals = pdf.splitTextToSize(value, Math.max(available, 10));
      // First line: label + first wrapped value line
      checkPageBreak(lineHeight);
      pdf.text(label, MARGIN_PT, y);
      pdf.text(wrappedVals[0] || '', MARGIN_PT + labelWidth, y);
      y += lineHeight;
      // Subsequent lines: indent to after the label
      for (let i = 1; i < wrappedVals.length; i++) {
        checkPageBreak(lineHeight);
        pdf.text(wrappedVals[i], MARGIN_PT + labelWidth, y);
        y += lineHeight;
      }
    };

    writeKeyValue('Inventory Type', htmlToPlain(inventoryTypeString));
    writeKeyValue('Updated', updatedAt);
    writeKeyValue('PIC', htmlToPlain(client.PIC ?? ''));
    writeKeyValue('Verification', htmlToPlain(client.verification ?? ''));
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
    console.log('🔍 Raw Departments data:', rawDepartments);
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
    const teamInstrAdditional = htmlToPlain(String(client['Team-Instr-Additional'] ?? '').trim());
    // Ensure proper spacing when joining sections
    const parts = [teamInstr, teamInstrAdditional].filter(Boolean);
    let teamInstrCombined = '';
    if (parts.length === 0) {
      teamInstrCombined = '';
    } else if (parts.length === 1) {
      teamInstrCombined = parts[0];
    } else {
      // Join with newline, but ensure proper spacing
      // If either part starts with bullet, ensure it's on its own line
      const first = parts[0];
      const second = parts[1];
      if (second.trim().startsWith('• ') || second.trim().match(/^\d+\s+[A-Z]/)) {
        // Second part starts with bullet or number pattern - ensure newline before it
        teamInstrCombined = first + '\n' + second;
      } else {
        teamInstrCombined = first + '\n' + second;
      }
    }
    // Ensure first bullet point is on its own line if text starts with bullet
    if (teamInstrCombined.trim().startsWith('• ') && !teamInstrCombined.match(/^\s*\n/)) {
      teamInstrCombined = '\n' + teamInstrCombined.trim();
    }
    if (teamInstrCombined) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 50); // Ensure header stays with content
      writeWrapped('Pre-Inventory Crew Instructions', contentWidth, 18);
      y += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      writeWrapped(teamInstrCombined, contentWidth, lineHeight);
      y += 12;
    }

    // Double space before next section
    y += 20;

    // NON-COUNT PRODUCTS section (from noncount)
    const noncount = htmlToPlain(String(client.noncount ?? '').trim());
    console.log('🔍 Raw NonCount data:', client.noncount);
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

    // Additional Images section (from pdfImageUrls: string or array)
    const parseImageUrls = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(Boolean).map(String);
      return String(val)
        .split(/\r?\n|,/) // split by newline or comma
        .map(s => s.trim())
        .filter(Boolean);
    };
    const imageUrls = parseImageUrls(client.pdfImageUrls);
    if (imageUrls.length) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      checkPageBreakWithContent(18, 100);
      writeWrapped('Images', contentWidth, 18);
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);

      const toDataUrl = async (url) => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const reader = new FileReader();
          const p = new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          return await p; // returns data URL
        } catch (e) {
          console.error('Failed to fetch image for PDF:', url, e);
          return null;
        }
      };

      // Render each image centered, scaled to fit content width
      for (const url of imageUrls) {
        const dataUrl = await toDataUrl(url);
        if (!dataUrl) continue;

        // Estimate image dimensions from data URL is non-trivial; create temp Image
        const img = new Image();
        const dim = await new Promise((resolve) => {
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
        if (!dim) continue;
        const maxW = contentWidth;
        const scale = Math.min(1, maxW / dim.w);
        const drawW = dim.w * scale;
        const drawH = dim.h * scale;

        checkPageBreak(drawH + 12);
        const x = MARGIN_PT + (contentWidth - drawW) / 2;
        pdf.addImage(dataUrl, 'PNG', x, y, drawW, drawH);
        y += drawH + 12;
      }
    }

    // Add QR code at bottom of last page if scan type is selected and QR code data exists
    const inventoryTypesArr = Array.isArray(client.inventoryTypes) ? client.inventoryTypes : (client.inventoryType ? [client.inventoryType] : []);
    const hasScanType = inventoryTypesArr.includes('scan');
    const qrCodeData = String(client.scannerQRCode || '').trim();
    
    if (hasScanType && qrCodeData) {
      try {
        // Dynamically import qrcode for web
        const QRCode = await import('qrcode');
        const qrCodeDataUrl = await QRCode.default.toDataURL(qrCodeData, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        // Get total pages and ensure we're on the last page
        const totalPages = pdf.internal.getNumberOfPages();
        pdf.setPage(totalPages);
        
        // Position QR code at bottom center of last page
        const qrSize = 108; // 1.5 inches (108pt)
        const qrX = (PAGE_WIDTH_PT - qrSize) / 2; // Center horizontally
        const qrY = PAGE_HEIGHT_PT - MARGIN_PT - qrSize - 20; // Bottom with margin
        
        // Add QR code image
        pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        
        // Add label below QR code
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const labelText = 'Scanner Configuration';
        const labelWidth = pdf.getTextWidth(labelText);
        pdf.text(labelText, (PAGE_WIDTH_PT - labelWidth) / 2, qrY + qrSize + 12);
      } catch (error) {
        console.error('Error generating QR code:', error);
        // Continue without QR code if generation fails
      }
    }

    // Return data URI or save; for now, trigger download with filename
    const filename = `Account_Instructions_${(client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  }

  // Native (iOS/Android via Expo): use HTML + expo-print
  const html = await buildHtml(client);
  const result = await Print.printToFileAsync({
    html,
    base64: false,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });
  return result.uri;
}

async function buildHtml(client) {
  const safeName = client.name || client.id || 'Unknown Client';
  const updatedAt = formatUpdatedAt(client.updatedAt);
  const extracted = extractPreInventoryBundle(client.sections);
  const preInv = String(extracted.generalText || client.preInventory || '').trim();
  const areaMapping = String(extracted.areaMappingRaw).trim();
  const storePrep = String(extracted.storePrepRaw).trim();
  
  // Generate QR code for native HTML if scan type is selected
  let qrCodeHtml = '';
  const inventoryTypesArr = Array.isArray(client.inventoryTypes) ? client.inventoryTypes : (client.inventoryType ? [client.inventoryType] : []);
  const hasScanType = inventoryTypesArr.includes('scan');
  const qrCodeData = String(client.scannerQRCode ?? '').trim();
  
  if (hasScanType && qrCodeData) {
    try {
      const QRCode = await import('qrcode');
      const qrCodeDataUrl = await QRCode.default.toDataURL(qrCodeData, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      qrCodeHtml = `
        <div class="section" style="text-align:center; margin-top:40px; page-break-inside:avoid;">
          <img src="${qrCodeDataUrl}" style="width:144pt;height:144pt;margin:0 auto;display:block;" />
          <div style="margin-top:8px;font-size:10px;color:#666;">Scanner Configuration</div>
        </div>
      `;
    } catch (error) {
      console.error('Error generating QR code for native:', error);
      // QR code will be empty if generation fails
    }
  }
  
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
          const teamInstrAdditional = String(client['Team-Instr-Additional'] ?? '').trim();
          const combined = [teamInstr, teamInstrAdditional].filter(Boolean).join('\n');
          if (!combined) return '';
          return `
            <div class="section">
              <div class="section-title">Pre-Inventory Crew Instructions</div>
              <div class="info" style="margin-top:8px;">
                <p style="white-space:pre-wrap;">${sanitizeBasicHtml(combined)}</p>
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

        ${(() => {
          const parseImageUrls = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.filter(Boolean).map(String);
            return String(val)
              .split(/\r?\n|,/) // newline or comma
              .map(s => s.trim())
              .filter(Boolean);
          };
          const urls = parseImageUrls(client.pdfImageUrls);
          if (!urls.length) return '';
          const imgs = urls.map(u => `<img src="${escapeHtml(u)}" style="max-width:${PAGE_WIDTH_PT - (2 * MARGIN_PT)}pt; width:100%; height:auto; margin:8pt 0; display:block;" />`).join('');
          return `
            <div class="section" style="page-break-inside:avoid;">
              <div class="section-title">Images</div>
              <div class="info" style="margin-top:8px; text-align:center;">
                ${imgs}
              </div>
            </div>
          `;
        })()}

        ${qrCodeHtml}
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
    .replace(/<\s*li\s*>/gi, '• ')  // Convert li opening to bullet (no extra spaces)
    .replace(/<\s*\/li\s*>/gi, '\n') // Convert li closing to newline
    .replace(/<\s*\/p\s*>/gi, '\n')  // Convert p closing to newline
    .replace(/<\s*\/div\s*>/gi, '\n') // Convert div closing to newline
    .replace(/<\s*br\s*\/?>/gi, '<br>'); // Keep br tags
  
  // Strip all HTML tags except basic formatting, but remove all attributes
  s = s.replace(/<(\/?)(b|strong|i|em|u|br)(?:\s[^>]*)?>/gi, '<$1$2>');
  s = s.replace(/<(?!\/?(b|strong|i|em|u|br)\b)[^>]*>/gi, '');
  
  // Fix malformed nested tags like <b><b></b><i>text</i></b>
  s = s.replace(/<b>\s*<b>\s*<\/b>\s*<i>/gi, '<i><b>');
  s = s.replace(/<\/i>\s*<\/b>/gi, '</b></i>');
  s = s.replace(/<b>\s*<b>/gi, '<b>');
  s = s.replace(/<\/b>\s*<\/b>/gi, '</b>');
  s = s.replace(/<i>\s*<i>/gi, '<i>');
  s = s.replace(/<\/i>\s*<\/i>/gi, '</i>');
  // Remove empty formatting tags
  s = s.replace(/<(b|strong|i|em|u)>\s*<\/\1>/gi, '');
  // Collapse immediate close-open boundaries (prevents mid-sentence splits like </b></i><i><b>)
  s = s.replace(/<\/(b|strong|i|em|u)>\s*<\1>/gi, '');
  // Run twice to handle cross-pairs like </b></i><i><b>
  s = s.replace(/<\/(b|strong|i|em|u)>\s*<\1>/gi, '');
  
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
  // Collapse single newlines that are likely soft wraps (not bullets or numbered list starts)
  s = s.replace(/([^\n])\n(?!\n)(?!•\s)(?!\d+\.\s)/g, '$1 ');
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


