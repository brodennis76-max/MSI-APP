import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { db } from '../firebase-config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

const FinalProcessingForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [processingText, setProcessingText] = useState(clientData.Processing || 'MSI Inventory Reports');

  // Ref for keyboard navigation
  const processingRef = React.useRef(null);

  const handleInputChange = (value) => {
    // Store raw input without formatting for better typing experience
    setProcessingText(value);
  };

  const handleInputBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(processingText);
    setProcessingText(formattedValue);
  };

  const formatAsBulletPoints = (text) => {
    if (!text.trim()) return text;
    
    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Format each line with a bullet point and capitalize first letter
    const bulletLines = lines.map((line) => {
      // Remove existing bullet points if they exist
      const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
      // Capitalize first letter (handle empty lines)
      const capitalizedLine = cleanLine.length > 0 
        ? cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1)
        : cleanLine;
      return `• ${capitalizedLine}`;
    });
    
    return bulletLines.join('\n');
  };

  const handleSaveToDevice = async () => {
    setSaving(true);

    try {
      console.log('Starting save to device process...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data
      console.log('Updating client data...');
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // Get the complete client data for PDF generation
      console.log('Fetching complete client data...');
      const clientDoc = await getDoc(clientRef);
      const completeClientData = { id: clientData.id, ...clientDoc.data() };
      console.log('Client data:', completeClientData);

      // Generate PDF
      console.log('Generating PDF...');
      const pdfUri = await generatePDF(completeClientData);
      console.log('PDF generated:', pdfUri);

      // Save to device
      console.log('Saving to device...');
      await saveToDevice(pdfUri, completeClientData.name);

      Alert.alert(
        'Success!',
        `Final processing data saved and PDF copied to device for ${clientData.name}.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error saving to device:', error);
      Alert.alert('Error', `Failed to save: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToClient = async () => {
    setSaving(true);

    try {
      console.log('Starting email to client process...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data
      console.log('Updating client data...');
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // Get the complete client data for PDF generation
      console.log('Fetching complete client data...');
      const clientDoc = await getDoc(clientRef);
      const completeClientData = { id: clientData.id, ...clientDoc.data() };
      console.log('Client data:', completeClientData);

      // Generate PDF
      console.log('Generating PDF...');
      const pdfUri = await generatePDF(completeClientData);
      console.log('PDF generated:', pdfUri);

      // Email to client
      console.log('Emailing to client...');
      await emailToClient(pdfUri, completeClientData);

      Alert.alert(
        'Success!',
        `Final processing data saved and emailed to ${clientData.name}.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error emailing to client:', error);
      Alert.alert('Error', `Failed to email: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async (clientData) => {
    try {
      console.log('Starting PDF generation...');
      console.log('Client data:', clientData);
      
      // Load logo as base64
      let logoBase64 = '';
      try {
        const logoPath = FileSystem.bundleDirectory + 'assets/login-logo.jpg';
        console.log('Attempting to load logo from:', logoPath);
        const logoData = await FileSystem.readAsStringAsync(logoPath, {
          encoding: 'base64',
        });
        logoBase64 = `data:image/jpeg;base64,${logoData}`;
        console.log('Logo loaded successfully');
      } catch (logoError) {
        console.log('Could not load logo, using text fallback:', logoError.message);
        logoBase64 = '';
      }

      // Generate HTML content for PDF
      console.log('Generating HTML content...');
      const htmlContent = generateHTMLContent(clientData, logoBase64);
      console.log('HTML content generated, length:', htmlContent.length);

      // Check if running on web
      if (Platform.OS === 'web') {
        console.log('Web platform detected, using web PDF generation...');
        return await generateWebPDF(htmlContent, `account-instructions-${clientData.name}.pdf`);
      } else {
        // Generate PDF for mobile
        console.log('Calling Print.printToFileAsync...');
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });
        
        console.log('PDF generated successfully, URI:', uri);
        return uri;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  };

  const generateWebPDF = async (htmlContent, filename) => {
    try {
      // Use html2pdf for much better PDF generation
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container with proper styling
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '8.5in';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.4';
      tempContainer.style.color = '#000';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.wordWrap = 'break-word';
      tempContainer.style.overflowWrap = 'break-word';
      tempContainer.style.whiteSpace = 'normal';
      tempContainer.style.padding = '0.75in';
      tempContainer.innerHTML = htmlContent;
      
      document.body.appendChild(tempContainer);
      
      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate PDF with html2pdf using the proven approach
      const opt = {
        margin: [25.4, 25.4, 25.4, 25.4], // top, left, bottom, right (in mm = 1 inch)
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        }
      };
      
      const pdf = await html2pdf().set(opt).from(tempContainer).save();
      
      // Clean up
      document.body.removeChild(tempContainer);
      
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
  };

  const generateHTMLContent = (clientData, logoBase64) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${clientData.name}</title>
          <style>
            @page {
              margin: 0.75in;
              size: 8.5in 11in;
              @bottom-center {
                content: "Page " counter(page);
                font-size: 10px;
                color: #666;
              }
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.4;
              color: #000;
              background: white;
              font-size: 12px;
              page-break-inside: avoid;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
            }
            
            .header {
              margin-top: 0;
              margin-bottom: 20px;
              position: relative;
              padding-top: 0;
            }
            
            .company-name {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              margin-top: 0;
              margin-bottom: 10px;
              color: #333;
            }
            
            .title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin-top: 0;
              margin-bottom: 5px;
            }
            
            .client-name {
              font-size: 14px;
              text-align: center;
              margin-top: 0;
              margin-bottom: 20px;
            }
            
            .info-section {
              margin-bottom: 15px;
            }
            
            .info-row {
              display: flex;
              margin-bottom: 5px;
            }
            
            .info-label {
              font-weight: bold;
              width: 120px;
              flex-shrink: 0;
            }
            
            .info-value {
              flex: 1;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
            }
            
            .warning-box {
              border: 2px solid #000;
              padding: 10px;
              margin: 15px 0;
              background: #f0f0f0;
            }
            
            .warning-text {
              font-weight: bold;
              text-align: center;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin: 20px 0 10px 0;
              text-transform: uppercase;
              page-break-before: auto;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            .avoid-break {
              page-break-inside: avoid;
            }
            
            @media print {
              .avoid-break {
                page-break-inside: avoid;
              }
              .page-break {
                page-break-before: always;
              }
            }
            
            .subsection-title {
              font-size: 14px;
              font-weight: bold;
              font-style: italic;
              margin: 15px 0 8px 0;
              page-break-before: auto;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .sub-subsection-title {
              font-size: 12px;
              font-weight: bold;
              font-style: italic;
              margin: 10px 0 5px 0;
              page-break-before: auto;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .content {
              margin-bottom: 15px;
              page-break-inside: avoid;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
            }
            
            .section {
              page-break-inside: auto;
              margin-bottom: 20px;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
            }
            
            .warning-box {
              page-break-inside: avoid;
              margin: 15px 0;
            }
            
            .section-title {
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .subsection-title {
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .bullet-list {
              margin: 8px 0;
              padding-left: 0.5in;
              page-break-inside: auto;
            }
            
            .numbered-list {
              margin: 8px 0;
              padding-left: 0.5in;
              page-break-inside: auto;
            }
            
            .bullet-list li {
              margin-bottom: 3px;
            }
            
            .numbered-list {
              margin: 8px 0;
              padding-left: 0.5in;
            }
            
            .numbered-list li {
              margin-bottom: 3px;
            }
            
            .area-mapping {
              margin: 8px 0;
              page-break-inside: auto;
            }
            
            .area-item {
              margin-bottom: 3px;
            }
            
            .subsection-group {
              page-break-inside: auto;
              margin-bottom: 15px;
            }
            
            .italic-bold {
              font-style: italic;
              font-weight: bold;
            }
            
            .bold {
              font-weight: bold;
            }
            
            .underline {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">MSI INVENTORY</div>
            <div class="title">ACCOUNT INSTRUCTIONS:</div>
            <div class="client-name">${clientData.name}</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <div class="info-label">Inventory Type:</div>
              <div class="info-value">${clientData.inventoryType || 'Scan'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">PIC:</div>
              <div class="info-value">${clientData.PIC || 'Stores to be contacted via phone prior to counts to confirm inventory.'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Time:</div>
              <div class="info-value">${clientData.startTime || 'Not specified'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Verification:</div>
              <div class="info-value">${clientData.verification || 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store).'}</div>
            </div>
          </div>

          <div class="warning-box">
            <div class="warning-text">If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!</div>
          </div>

          <!-- PRE-INVENTORY SECTION -->
          <div class="section">
            <div class="section-title">PRE-INVENTORY</div>
            
            <div class="subsection-title">General Instructions:</div>
            <div class="content">
              ${clientData.preInventory && clientData.preInventory.trim() ? clientData.preInventory.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('') : '<div class="bullet-list"><li>N/A</li></div>'}
            </div>
            
            <div class="subsection-group">
              <div class="subsection-title">Area Mapping:</div>
              <div class="content">
                ${clientData.sections && clientData.sections[0] && clientData.sections[0].subsections && clientData.sections[0].subsections[0] && clientData.sections[0].subsections[0].content && clientData.sections[0].subsections[0].content.trim() ? clientData.sections[0].subsections[0].content.split('\n').map(line => 
                  line.trim() ? `<div class="area-item">${line.replace(/^[a-z]\.\s*/, '')}</div>` : ''
                ).join('') : `
                <div>Area numbers will be as follows. DO NOT ADD ADDITIONAL AREA NUMBERS:</div>
                <div class="area-mapping">
                  <div class="area-item">a. 1021, 1061, 1121, 1151, etc. for gondolas. Gondolas will start at the FEC, right side (the ##21 series), BEC, left side (the ##61 series). 1021 would be the first gondola closest to the door (front end and right side), 1061 (back end right side), 1121/1161 would be the next gondola, etc.</div>
                  <div class="area-item">b. Front wall 4001</div>
                  <div class="area-item">c. Left wall 4101</div>
                  <div class="area-item">d. Rear wall 4201</div>
                  <div class="area-item">e. Right wall 4301</div>
                  <div class="area-item">f. Checkstand 5001</div>
                  <div class="area-item">g. Checkstand wall 5002</div>
                  <div class="area-item">h. Checkstand Under 5003</div>
                  <div class="area-item">i. Lottery Tickets 5099 (scanned by each ticket)</div>
                  <div class="area-item">j. Displays 6001, 6002, etc (6000 series)</div>
                  <div class="area-item">k. Office 7001</div>
                  <div class="area-item">l. Cooler Doors 8001</div>
                  <div class="area-item">m. Cooler Rear or Soda Walk-in 8101</div>
                  <div class="area-item">n. Beer Walk-in 8102</div>
                  <div class="area-item">o. Beer Cave 8103</div>
                  <div class="area-item">p. Outside 8500</div>
                  <div class="area-item">q. Backroom 9001</div>
                  <div class="area-item">r. Totes 9902 (separate each tote by location numbers. One tote per location).</div>
                </div>
                `}
                <ul class="bullet-list">
                  <li>All areas are to be counted in 4 foot locations.</li>
                  <li>ALL LOCATIONS MUST HAVE A DESCRIPTION. BE EXTRA DESCRIPTIVE IN THE CHECKOUT AREA. This will allow the team that comes in behind you to count in the correct locations.</li>
                </ul>
              </div>
            </div>

            <div class="subsection-title">Store Prep Instructions:</div>
            <div class="content">
              ${clientData.sections && clientData.sections[0] && clientData.sections[0].subsections && clientData.sections[0].subsections[1] && clientData.sections[0].subsections[1].content && clientData.sections[0].subsections[1].content.trim() ? clientData.sections[0].subsections[1].content.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^\d+\.\s*/, '')}</li></div>` : ''
              ).join('') : '<div class="bullet-list"><li>N/A</li></div>'}
            </div>
          </div>

          <!-- INVENTORY PROCEDURES SECTION -->
          <div class="section">
            <div class="section-title">Inventory Procedures</div>
            <div class="content">
              <ul class="bullet-list">
                <li><span class="bold">First Task:</span> Inventory manager's first task upon entering the store is a pre-inventory meeting with the store manager.</li>
                <li><span class="bold">During the Meeting, Perform the Following:</span>
                  <ul class="bullet-list">
                    <li>Identify who will be involved with inventory from the store (who will be walking posting sheets, who can answer questions, etc.)</li>
                    <li>Communicate the inventory flow.</li>
                    <li>Walk the store and discuss any areas that need to be addressed (prep/pricing), cooler and stockroom organization, and any hidden product.</li>
                  </ul>
                </li>
              </ul>
              <div class="warning-box">
                <div class="warning-text">IF STORE IS NOT COUNTABLE CONTACT MSI CORPORATE IMMEDIATELY TO CANCEL THE INVENTORY.</div>
              </div>
              ${clientData.Inv_Proc && clientData.Inv_Proc.trim() ? `
              <div class="content">
                ${clientData.Inv_Proc.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            </div>
          </div>

          <!-- AUDITS SECTION -->
          <div class="section">
            <div class="section-title">AUDITS</div>
            <div class="content">
              <ul class="bullet-list">
                <li>iPads will be provided progressively to the store manager as areas are completed.</li>
                <li>Audit trails will be provided as requested based on posting sheet results, within reason, during the count.</li>
              </ul>
              ${clientData.Audits && clientData.Audits.trim() ? `
              <div class="content">
                ${clientData.Audits.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            </div>
          </div>

          <!-- INVENTORY FLOW SECTION -->
          <div class="section">
            <div class="section-title">INVENTORY FLOW</div>
            <div class="content">
              ${clientData.Inv_Flow && clientData.Inv_Flow.trim() ? `
              <div class="content">
                ${clientData.Inv_Flow.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            </div>
          </div>

          <!-- PRE INVENTORY TEAM INSTRUCTIONS SECTION -->
          <div class="section">
            <div class="section-title">PRE INVENTORY TEAM INSTRUCTIONS</div>
            <div class="content">
              ${clientData['Team-Instr'] && clientData['Team-Instr'].trim() ? `
              <div class="content">
                ${clientData['Team-Instr'].split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            </div>
          </div>

          <!-- NON-COUNT PRODUCTS SECTION -->
          <div class="section">
            <div class="section-title">Non-Count Products</div>
            <div class="content">
              ${clientData.noncount && clientData.noncount.trim() ? `
              <div class="content">
                ${clientData.noncount.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            </div>
          </div>

          <!-- REPORTS SECTION -->
          <div class="section">
            <div class="section-title">REPORTS</div>

            <div class="subsection-title">PROGRESSIVE REPORTS</div>
          <div class="content">
            <div class="sub-subsection-title">POSTING SHEETS</div>
            ${clientData.Prog_Rep && clientData.Prog_Rep.trim() ? (() => {
              const lines = clientData.Prog_Rep.split('\n');
              const postingSheetsStart = lines.findIndex(line => line.toLowerCase().includes('posting sheets'));
              const utilityReportsStart = lines.findIndex(line => line.toLowerCase().includes('utility reports'));
              
              const postingSheetsLines = postingSheetsStart >= 0 && utilityReportsStart >= 0 
                ? lines.slice(postingSheetsStart + 1, utilityReportsStart)
                : postingSheetsStart >= 0 
                  ? lines.slice(postingSheetsStart + 1)
                  : lines;
              
              const postingSheetsContent = postingSheetsLines.filter(line => line.trim()).join('\n');
              
              return postingSheetsContent ? `
              <div class="content">
                ${postingSheetsContent.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>';
            })() : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
            
            <div class="sub-subsection-title">UTILITY REPORTS</div>
            ${clientData.Prog_Rep && clientData.Prog_Rep.trim() ? (() => {
              const lines = clientData.Prog_Rep.split('\n');
              const utilityReportsStart = lines.findIndex(line => line.toLowerCase().includes('utility reports'));
              
              const utilityReportsLines = utilityReportsStart >= 0 
                ? lines.slice(utilityReportsStart + 1)
                : [];
              
              const utilityReportsContent = utilityReportsLines.filter(line => line.trim()).join('\n');
              
              return utilityReportsContent ? `
              <div class="content">
                ${utilityReportsContent.split('\n').map(line => 
                  line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
                ).join('')}
              </div>
              ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>';
            })() : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
          </div>

          <div class="subsection-title">FINALIZING THE COUNT</div>
          <div class="warning-box">
            <div class="warning-text">VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER!</div>
          </div>
          <div class="content">
            <div>Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.</div>
            <ol class="numbered-list">
              <li>INTERIM 201 Price Exception Report</li>
              <li>INTERIM 202 Quantity Exception Report</li>
              <li>INTERIM 130 Location Report</li>
              <li>INTERIM 110 Category Report</li>
            </ol>
            ${clientData.Finalize && clientData.Finalize.trim() ? `
            <div class="content">
              ${clientData.Finalize.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('')}
            </div>
            ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
          </div>

          <div class="subsection-title">FINAL REPORTS</div>
          <div class="content">
            ${clientData.Fin_Rep && clientData.Fin_Rep.trim() ? `
            <div class="content">
              ${clientData.Fin_Rep.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('')}
            </div>
            ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
          </div>

          <div class="subsection-title">FINAL PROCESSING</div>
          <div class="content">
            <div class="sub-subsection-title">MSI Inventory Reports</div>
            <ol class="numbered-list">
              <li>When completing METS, notate the number of totes, count start, count stop and out the door time in the Timesheet notes along with the reason for wrap time past 15 minutes.</li>
              <li>METS will send all required reports.</li>
            </ol>
            ${clientData.Processing && clientData.Processing.trim() ? `
            <div class="content">
              ${clientData.Processing.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('')}
            </div>
            ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
          </div>
          </div>

          ${clientData.additionalNotes && clientData.additionalNotes.trim() ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <div class="content">
              ${clientData.additionalNotes.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('')}
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  const saveToDevice = async (pdfUri, clientName) => {
    try {
      console.log('Sharing PDF for saving:', pdfUri);
      
      // Use sharing to let user save to their preferred location
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save Account Instructions for ${clientName}`,
      });
      
      console.log('PDF shared successfully');
    } catch (error) {
      console.error('Error sharing PDF:', error);
      console.error('Error details:', error.message);
      Alert.alert('Error', `Failed to share PDF. Error: ${error.message}`);
    }
  };

  const emailToClient = async (pdfUri, clientData) => {
    try {
      console.log('Emailing PDF with original file:', pdfUri);
      
      // Use simple sharing options
      const shareOptions = {
        mimeType: 'application/pdf',
        dialogTitle: `Email Account Instructions for ${clientData.name}`,
      };

      // If client has email, add it to the share options
      if (clientData.email) {
        shareOptions.recipients = [clientData.email];
      }

      await Sharing.shareAsync(pdfUri, shareOptions);
      
    } catch (error) {
      console.error('Error sharing PDF for email:', error);
      console.error('Error details:', error.message);
      Alert.alert('Error', `Unable to share PDF. Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Final Processing</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Final Processing for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Final Processing Details</Text>
          <Text style={styles.helperText}>"MSI Inventory Reports" is pre-populated below. You can modify, add to, or customize this content as needed. Each item on a new line - bullet points will be added automatically.</Text>
          
          <TextInput
            ref={processingRef}
            style={styles.textArea}
            value={processingText}
            onChangeText={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Enter final processing details on a new line"
            multiline
            numberOfLines={10}
            autoCapitalize="sentences"
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="done"
          />
        </View>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveToDevice}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Copy to Device'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.emailButton, saving && styles.saveButtonDisabled]}
          onPress={handleEmailToClient}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Emailing...' : 'Email to Client'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.finalizeButton}
          onPress={onComplete}
        >
          <Text style={styles.saveButtonText}>Finalize</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 200,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6f42c1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  emailButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  finalizeButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FinalProcessingForm;
