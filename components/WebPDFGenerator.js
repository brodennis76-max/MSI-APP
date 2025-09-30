import React, { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const WebPDFGenerator = {
  // Web-compatible PDF generation using jsPDF
  generatePDF: async (htmlContent, filename = 'account-instructions.pdf') => {
    if (Platform.OS === 'web') {
      // For web, use browser's print to PDF functionality
      return await WebPDFGenerator.generateWebPDF(htmlContent, filename);
    } else {
      // For mobile, use the existing Print.printToFileAsync
      return await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
    }
  },

  generateWebPDF: async (htmlContent, filename) => {
    try {
      // Use jsPDF for proper file download
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a temporary div to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.backgroundColor = 'white';
      document.body.appendChild(tempDiv);
      
      // Convert HTML to canvas then to PDF
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      // Save the PDF file
      pdf.save(filename);
      
      return { uri: 'web-pdf-downloaded' };
    } catch (error) {
      console.error('Error generating web PDF:', error);
      // Fallback to print dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
      return { uri: 'web-pdf-printed' };
    }
  },

  // Alternative: Use jsPDF for more control
  generatePDFWithJsPDF: async (htmlContent, filename = 'account-instructions.pdf') => {
    if (Platform.OS === 'web') {
      try {
        // Dynamically import jsPDF
        const { default: jsPDF } = await import('jspdf');
        
        // Create a temporary div to render the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        
        // Convert HTML to canvas then to PDF
        const canvas = await html2canvas(tempDiv);
        const imgData = canvas.toDataURL('image/png');
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        // Clean up
        document.body.removeChild(tempDiv);
        
        // Save the PDF
        pdf.save(filename);
        
        return { uri: 'web-pdf-generated' };
      } catch (error) {
        console.error('Error generating PDF with jsPDF:', error);
        // Fallback to print dialog
        return await WebPDFGenerator.generateWebPDF(htmlContent, filename);
      }
    } else {
      // For mobile, use the existing Print.printToFileAsync
      return await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
    }
  }
};

export default WebPDFGenerator;
