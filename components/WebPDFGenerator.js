import React, { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const WebPDFGenerator = {
  generatePDF: async (htmlContent, filename = 'account-instructions.pdf') => {
    if (Platform.OS === 'web') {
      return await WebPDFGenerator.generateWebPDF(htmlContent, filename);
    } else {
      return await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
      });
    }
  },

  generateWebPDF: async (htmlContent, filename) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Apply PDF-optimized styling
      Object.assign(tempDiv.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '7.5in',
        height: 'auto',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#333',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'visible',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        hyphens: 'auto'
      });
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false
      });
      
      document.body.removeChild(tempDiv);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });
      
      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
      
      // Handle multiple pages
      let currentY = 0;
      let pageNumber = 1;
      const padding = 20;
      const adjustedContentHeight = contentHeight + (padding / 72);
      
      while (currentY < imgHeight) {
        if (pageNumber > 1) {
          pdf.addPage();
        }
        
        const remainingHeight = imgHeight - currentY;
        const pageContentHeight = Math.min(adjustedContentHeight, remainingHeight);
        const sourceY = (currentY / imgHeight) * canvas.height;
        const sourceHeight = (pageContentHeight / imgHeight) * canvas.height;
        
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceHeight);
        
        pageCtx.drawImage(
          canvas,
          0, Math.floor(sourceY),
          canvas.width, Math.ceil(sourceHeight),
          0, 0,
          pageCanvas.width, pageCanvas.height
        );
        
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          imgWidth,
          pageContentHeight,
          undefined,
          'FAST'
        );
        
        currentY += contentHeight - (padding / 72);
        pageNumber++;
        
        if (pageNumber > 50) break;
      }
      
      pdf.save(filename);
      return { uri: 'web-pdf-generated' };
    } catch (error) {
      console.error('Error generating web PDF:', error);
      
      try {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                @page { margin: 0.5in; size: letter; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              ${htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || htmlContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setTimeout(() => printWindow.close(), 1000);
          }, 500);
        };
        
        return { uri: 'web-pdf-printed' };
      } catch (fallbackError) {
        console.error('Fallback print failed:', fallbackError);
        Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        return { uri: 'error' };
      }
    }
  },

  // Alternative: Use html2pdf.js library
  generatePDFWithHtml2Pdf: async (htmlContent, filename = 'account-instructions.pdf') => {
    if (Platform.OS === 'web') {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        Object.assign(tempDiv.style, {
          width: '7.5in',
          backgroundColor: 'white',
          padding: '0',
          margin: '0',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#333',
          overflow: 'visible',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          hyphens: 'auto'
        });
        
        document.body.appendChild(tempDiv);
        
        const opt = {
          margin: 10,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { 
            unit: 'in', 
            format: 'letter', 
            orientation: 'portrait' 
          }
        };
        
        await html2pdf().set(opt).from(tempDiv).save();
        document.body.removeChild(tempDiv);
        
        return { uri: 'web-pdf-generated' };
      } catch (error) {
        console.error('Error with html2pdf:', error);
        // Fallback to main method
        return await WebPDFGenerator.generateWebPDF(htmlContent, filename);
      }
    } else {
      // For mobile, use the existing Print.printToFileAsync
      return await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
      });
    }
  }
};

export default WebPDFGenerator;