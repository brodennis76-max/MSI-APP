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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { generateUniversalPDF } from '../utils/pdfUtils';

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
      const pdfUri = await generateUniversalPDF(completeClientData);
      console.log('PDF generated:', pdfUri);

      // Save to device
      console.log('Saving to device...');
      await saveToDevice(pdfUri, completeClientData.name);

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        // For web, use native browser alert
        window.alert(`Success! Final processing data saved and PDF copied to device for ${clientData.name}.`);
      } else {
        // For mobile, use React Native Alert
        Alert.alert(
          'Success!',
          `Final processing data saved and PDF copied to device for ${clientData.name}.`,
          [
            { text: 'OK' }
          ]
        );
      }
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
      const pdfUri = await generateUniversalPDF(completeClientData);
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

  const handleSaveData = async () => {
    setSaving(true);

    try {
      console.log('Saving data to server...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        window.alert(`Data saved successfully for ${clientData.name}!`);
      } else {
        Alert.alert('Success!', `Data saved successfully for ${clientData.name}!`);
      }

      // Complete the workflow after saving
      onComplete();
    } catch (error) {
      console.error('Error saving data:', error);
      if (Platform.OS === 'web') {
        window.alert(`Failed to save data: ${error.message}. Please try again.`);
      } else {
        Alert.alert('Error', `Failed to save data: ${error.message}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReports = async () => {
    setSaving(true);

    try {
      console.log('🔥 handlePrintReports: Starting PDF generation...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data first
      console.log('🔥 handlePrintReports: Updating client data...');
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // Get the complete client data for PDF generation
      console.log('🔥 handlePrintReports: Fetching complete client data...');
      const clientDoc = await getDoc(clientRef);
      const completeClientData = { id: clientData.id, ...clientDoc.data() };
      console.log('🔥 handlePrintReports: Client data:', completeClientData);

      // Generate PDF
      console.log('🔥 handlePrintReports: Calling generateUniversalPDF...');
      
      if (Platform.OS === 'web') {
        // For web, use the same approach as UniversalPDFGenerator
        console.log('🔥 handlePrintReports: Using web-specific PDF generation...');
        const pdfUri = await generateWebPDF(completeClientData);
        console.log('🔥 handlePrintReports: PDF generated successfully:', pdfUri);
        window.alert(`Reports generated successfully for ${clientData.name}! PDF downloaded.`);
      } else {
        // For mobile, use the original approach
        const pdfUri = await generateUniversalPDF(completeClientData);
        console.log('🔥 handlePrintReports: PDF generated successfully:', pdfUri);
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Print Account Instructions for ${clientData.name}`,
        });
        Alert.alert('Success!', `Reports generated and ready to print for ${clientData.name}!`);
      }
    } catch (error) {
      console.error('🔥 handlePrintReports ERROR:', error);
      console.error('🔥 Error code:', error.code);
      console.error('🔥 Error message:', error.message);
      console.error('🔥 Error stack:', error.stack);
      if (Platform.OS === 'web') {
        window.alert(`Failed to generate reports: ${error.message}. Please try again.`);
      } else {
        Alert.alert('Error', `Failed to generate reports: ${error.message}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Web-specific PDF generation function (copied from UniversalPDFGenerator)
  const generateWebPDF = async (clientData) => {
    try {
      console.log('🔥 generateWebPDF: Starting web PDF generation...');
      
      // Dynamic import for web-only libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Generate HTML content (same as UniversalPDFGenerator)
      const html = generateUniversalHTML(clientData);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Apply PDF-optimized styling for web
      Object.assign(tempDiv.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '8.5in',
        height: 'auto',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#333',
        padding: '0.5in',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'visible',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        hyphens: 'auto',
        pageBreakInside: 'avoid'
      });
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use jsPDF with better page break handling
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });
      
      // Convert inches to points (72 points = 1 inch)
      const margin = 36; // 0.5 inch
      const pageWidth = 612; // 8.5 inches
      const pageHeight = 792; // 11 inches
      const contentWidth = pageWidth - (2 * margin); // 540 points
      const contentHeight = pageHeight - (2 * margin); // 720 points
      
      // Set up PDF styling
      pdf.setFont('helvetica');
      pdf.setFontSize(12);
      
      let currentY = margin;
      let pageNumber = 1;
      
      // Helper function to add new page if needed
      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          pageNumber++;
          return true;
        }
        return false;
      };
      
      // Helper function to add text with wrapping
      const addText = (text, x, y, options = {}) => {
        const fontSize = options.fontSize || 12;
        const fontStyle = options.fontStyle || 'normal';
        const maxWidth = options.maxWidth || contentWidth;
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 1.2;
        
        checkPageBreak(lines.length * lineHeight);
        
        lines.forEach((line, index) => {
          pdf.text(line, x, currentY + (index * lineHeight));
        });
        
        currentY += lines.length * lineHeight;
        return lines.length * lineHeight;
      };
      
      // Add header
      checkPageBreak(60);
      addText('MSI INVENTORY', margin, currentY, { fontSize: 20, fontStyle: 'bold' });
      currentY += 20;
      addText('ACCOUNT INSTRUCTIONS', margin, currentY, { fontSize: 18, fontStyle: 'bold' });
      currentY += 20;
      addText(clientData.name, margin, currentY, { fontSize: 16, fontStyle: 'bold' });
      currentY += 30;
      
      // Add basic information
      const basicInfo = [
        `Inventory: ${clientData.accountType || clientData.storeType || 'Not specified'}`,
        `Updated: ${new Date().toLocaleDateString()}`,
        `PIC: ${clientData.PIC || 'Not specified'}`,
        `Store Start Time: ${clientData.storeStartTime || 'Not specified'}`,
        `Verification: ${clientData.verification || 'Not specified'}`
      ];
      
      basicInfo.forEach(info => {
        addText(info, margin, currentY);
        currentY += 15;
      });
      
      currentY += 20;
      
      // Add sections
      const sections = [
        { title: 'PRE-INVENTORY INSTRUCTIONS', content: clientData.Pre_Inv },
        { title: 'INVENTORY PROCEDURES', content: clientData.Inv_Proc },
        { title: 'AUDITS', content: clientData.Audits },
        { title: 'INVENTORY FLOW', content: clientData.Inv_Flow },
        { title: 'PRE-INVENTORY TEAM INSTRUCTIONS', content: clientData.Team_Instr },
        { title: 'NON-COUNT PRODUCTS', content: clientData.Non_Count },
        { title: 'PROGRESSIVE REPORTS', content: clientData.Prog_Rep },
        { title: 'FINALIZING COUNT', content: clientData.Finalize },
        { title: 'FINAL REPORTS', content: clientData.Fin_Rep },
        { title: 'FINAL PROCESSING', content: clientData.Processing }
      ];
      
      sections.forEach(section => {
        if (section.content && section.content.trim()) {
          checkPageBreak(40);
          currentY += 10;
          addText(section.title, margin, currentY, { fontSize: 16, fontStyle: 'bold' });
          currentY += 10;
          addText(section.content, margin, currentY);
          currentY += 15;
        }
      });
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      // Save PDF
      const filename = `Account_Instructions_${clientData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      console.log('🔥 generateWebPDF: PDF generated successfully');
      return filename;
      
    } catch (error) {
      console.error('🔥 generateWebPDF ERROR:', error);
      throw error;
    }
  };

  // Generate HTML content for web PDF (same as UniversalPDFGenerator)
  const generateUniversalHTML = (clientData) => {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${clientData.name}</title>
          <style>
            @page {
              size: letter;
              margin: 0.5in;
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
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              page-break-after: avoid;
            }
            
            .header h1 {
              font-size: 20px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            
            .header h2 {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            
            .header h3 {
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 20px 0;
            }
            
            .info-section {
              margin-bottom: 20px;
              page-break-after: avoid;
            }
            
            .info-section p {
              margin: 5px 0;
              font-size: 12px;
            }
            
            .section {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            
            .section-content {
              font-size: 12px;
              line-height: 1.4;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="header avoid-break">
            <h1>MSI INVENTORY</h1>
            <h2>ACCOUNT INSTRUCTIONS</h2>
            <h3>${clientData.name}</h3>
          </div>
          
          <div class="info-section avoid-break">
            <p><strong>Inventory:</strong> ${clientData.accountType || clientData.storeType || 'Not specified'}</p>
            <p><strong>Updated:</strong> ${currentDate}</p>
            <p><strong>PIC:</strong> ${clientData.PIC || 'Not specified'}</p>
            <p><strong>Store Start Time:</strong> ${clientData.storeStartTime || 'Not specified'}</p>
            <p><strong>Verification:</strong> ${clientData.verification || 'Not specified'}</p>
          </div>
          
          ${generateSectionsHTML(clientData)}
        </body>
      </html>
    `;
  };

  const generateSectionsHTML = (clientData) => {
    const sections = [
      { title: 'PRE-INVENTORY INSTRUCTIONS', content: clientData.Pre_Inv },
      { title: 'INVENTORY PROCEDURES', content: clientData.Inv_Proc },
      { title: 'AUDITS', content: clientData.Audits },
      { title: 'INVENTORY FLOW', content: clientData.Inv_Flow },
      { title: 'PRE-INVENTORY TEAM INSTRUCTIONS', content: clientData.Team_Instr },
      { title: 'NON-COUNT PRODUCTS', content: clientData.Non_Count },
      { title: 'PROGRESSIVE REPORTS', content: clientData.Prog_Rep },
      { title: 'FINALIZING COUNT', content: clientData.Finalize },
      { title: 'FINAL REPORTS', content: clientData.Fin_Rep },
      { title: 'FINAL PROCESSING', content: clientData.Processing }
    ];
    
    return sections.map(section => {
      if (section.content && section.content.trim()) {
        return `
          <div class="section">
            <div class="section-title">${section.title}</div>
            <div class="section-content">${section.content}</div>
          </div>
        `;
      }
      return '';
    }).join('');
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
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
      >
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

      {/* Single row with all three buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.generateButton, saving && styles.disabledButton]}
          onPress={async () => {
            console.log('Generate PDF button clicked');
            try {
              // Save data first, then generate PDF
              console.log('Calling handleSaveData...');
              await handleSaveData();
              console.log('handleSaveData completed, calling handlePrintReports...');
              await handlePrintReports();
              console.log('handlePrintReports completed');
            } catch (error) {
              console.error('Error in Generate PDF button:', error);
              if (Platform.OS === 'web') {
                window.alert(`Error generating PDF: ${error.message}`);
              } else {
                Alert.alert('Error', `Error generating PDF: ${error.message}`);
              }
            }
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate PDF</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.completeButton} onPress={() => {
          // Navigate back to dashboard
          onComplete();
        }}>
          <Text style={styles.completeButtonText}>Complete</Text>
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
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
});

export default FinalProcessingForm;
