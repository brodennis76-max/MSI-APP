import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import PDFViewer from './PDFViewer';

const FirebasePDFGenerator = ({ clientId, onBack, onComplete }) => {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      console.log('Fetching client data for ID:', clientId);
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        const data = clientSnap.data();
        console.log('Client data fetched:', data);
        setClientData({ 
          id: clientSnap.id, 
          ...data,
          // Ensure all fields have default values
          name: data.name || 'Unknown Client',
          email: data.email || '',
          inventoryType: data.inventoryType || 'Not specified',
          PIC: data.PIC || 'Not specified',
          startTime: data.startTime || 'Not specified',
          verification: data.verification || 'Not specified',
          additionalNotes: data.additionalNotes || 'None',
          preInventory: data.preInventory || '',
          Inv_Proc: data.Inv_Proc || '',
          Audits: data.Audits || '',
          Inv_Flow: data.Inv_Flow || '',
          noncount: data.noncount || '',
          'Team-Instr': data['Team-Instr'] || '',
          Prog_Rep: data.Prog_Rep || '',
          Finalize: data.Finalize || '',
          Fin_Rep: data.Fin_Rep || '',
          Processing: data.Processing || ''
        });
      } else {
        Alert.alert('Error', 'Client not found in database');
        onBack();
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load client data from Firebase');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const getLogoBase64 = async () => {
    try {
      // Try multiple paths for the logo file
      const possiblePaths = [
        FileSystem.bundleDirectory + 'assets/login-logo.jpg',
        FileSystem.documentDirectory + 'assets/login-logo.jpg',
        'file:///Users/dennisellingburg/Documents/MSI/msi-expo/assets/login-logo.jpg'
      ];
      
      for (const logoPath of possiblePaths) {
        try {
          console.log('Trying logo path:', logoPath);
          const base64 = await FileSystem.readAsStringAsync(logoPath, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (base64 && base64.length > 0) {
            console.log('Successfully loaded JPG logo from:', logoPath);
            return `data:image/jpeg;base64,${base64}`;
          }
        } catch (pathError) {
          console.log('Failed to load from path:', logoPath, pathError.message);
          continue;
        }
      }
      
      // If all paths fail, use a more detailed SVG fallback
      console.log('All JPG paths failed, using detailed SVG fallback');
      const svgLogo = `
        <svg width="250" height="80" viewBox="0 0 250 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="250" height="80" fill="#007AFF" stroke="#0056b3" stroke-width="2"/>
          <text x="125" y="35" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">MSI</text>
          <text x="125" y="55" font-family="Arial, sans-serif" font-size="14" font-weight="normal" fill="white" text-anchor="middle">INVENTORY SERVICE CORPORATION</text>
        </svg>
      `;
      
      const base64 = btoa(unescape(encodeURIComponent(svgLogo)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      console.log('Error in logo loading, using final fallback:', error.message);
      // Final fallback - simple text-based logo
      const svgLogo = `
        <svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="60" fill="#007AFF"/>
          <text x="100" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">MSI</text>
          <text x="100" y="50" font-family="Arial, sans-serif" font-size="12" font-weight="normal" fill="white" text-anchor="middle">INVENTORY SERVICE</text>
        </svg>
      `;
      
      const base64 = btoa(unescape(encodeURIComponent(svgLogo)));
      return `data:image/svg+xml;base64,${base64}`;
    }
  };

  const generateHTML = async (client) => {
    const logoBase64 = await getLogoBase64();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${client.name}</title>
          <style>
            @page {
              margin: 1.25in;
              size: 8.5in 11in;
              @bottom-center {
                content: "Page " counter(page);
                font-size: 10px;
                color: #666;
              }
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
            }
            
            
            .header {
              margin-bottom: 20px;
              position: relative;
            }
            
            .company-name {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 10px;
              color: #333;
            }
            
            .title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 5px;
            }
            
            .client-name {
              font-size: 14px;
              text-align: center;
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
            }
            
            .subsection-title {
              font-size: 14px;
              font-weight: bold;
              font-style: italic;
              margin: 15px 0 8px 0;
            }
            
            .sub-subsection-title {
              font-size: 12px;
              font-weight: bold;
              font-style: italic;
              margin: 10px 0 5px 0;
            }
            
            .content {
              margin-bottom: 15px;
            }
            
            .bullet-list {
              margin: 8px 0;
              padding-left: 0.5in;
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
            }
            
            .area-item {
              margin-bottom: 3px;
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
            <div class="client-name">${client.name}</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <div class="info-label">Inventory Type:</div>
              <div class="info-value">${client.inventoryType || 'Scan'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">PIC:</div>
              <div class="info-value">${client.PIC || 'Stores to be contacted via phone prior to counts to confirm inventory.'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Time:</div>
              <div class="info-value">${client.startTime || 'Not specified'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Verification:</div>
              <div class="info-value">${client.verification || 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store).'}</div>
            </div>
          </div>

          <div class="warning-box">
            <div class="warning-text">If you are going to be more than 5 minutes late to a store you must contact the store BEFORE you are late. NO EXCEPTIONS!!!</div>
          </div>

          <!-- PRE-INVENTORY SECTION -->
          <div class="section-title">PRE-INVENTORY</div>
          
          <div class="subsection-title">General Instructions:</div>
          <div class="content">
            ${client.preInventory ? client.preInventory.split('\n').map(line => 
              line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
            ).join('') : '<div class="bullet-list"><li>No general instructions provided.</li></div>'}
          </div>
          
          <div class="subsection-title">Area Mapping:</div>
          <div class="content">
            ${client.sections && client.sections[0] && client.sections[0].subsections && client.sections[0].subsections[0] ? client.sections[0].subsections[0].content.split('\n').map(line => 
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

          <div class="subsection-title">Store Prep Instructions:</div>
          <div class="content">
            ${client.sections && client.sections[0] && client.sections[0].subsections && client.sections[0].subsections[1] ? client.sections[0].subsections[1].content.split('\n').map(line => 
              line.trim() ? `<div class="bullet-list"><li>${line.replace(/^\d+\.\s*/, '')}</li></div>` : ''
            ).join('') : '<div class="bullet-list"><li>No store prep instructions provided.</li></div>'}
          </div>

          <!-- INVENTORY PROCEDURES SECTION -->
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
          </div>

          <!-- AUDITS SECTION -->
          <div class="section-title">AUDITS</div>
          <div class="content">
            <ul class="bullet-list">
              <li>iPads will be provided progressively to the store manager as areas are completed.</li>
              <li>Audit trails will be provided as requested based on posting sheet results, within reason, during the count.</li>
            </ul>
          </div>

          <!-- INVENTORY FLOW SECTION -->
          <div class="section-title">INVENTORY FLOW</div>
          <div class="content">
            <ul class="bullet-list">
              <li>Start lottery and verify with store before proceeding. Once verified move on to cigarettes. Count all cigarettes, then provide the 170 Count Recap report for the store to verify counts by 4' sections to the store counts. Standard inventory flow for remainder of store.</li>
              <li>Be flexible! If the store would like a different flow be compliant.</li>
            </ul>
          </div>

          <!-- PRE INVENTORY TEAM INSTRUCTIONS SECTION -->
          <div class="section-title">PRE INVENTORY TEAM INSTRUCTIONS</div>
          <div class="content">
            <div>The Inventory Manager will brief the team on the proper counting procedures and their responsibilities to the customer and their customers. Below are the guidelines that must always be followed:</div>
            <ol class="numbered-list">
              <li>Shirts are to be tucked in, pants pulled up, no hats or facial piercings.</li>
              <li>NO FOOD OR DRINK ON THE SALES FLOOR.</li>
              <li>Cell phones are to be turned OFF, except for supervisors running the inventory.</li>
              <li>Talking will be kept to a minimum and is limited to the current inventory.</li>
              <li>iPod, or any other music device and earbuds are not allowed.</li>
              <li>Always be polite, courteous and respectful to the store, and the store's customers.</li>
              <li>If you cannot see it, you cannot count it....use a ladder where needed.</li>
              <li>During break times, do not loiter in front of the store. Smoking will be done away from the store, near the vans.</li>
              <li>All purchased items must have a receipt attached...do not consume items prior to purchase.</li>
              <li>Count from left to right, top to bottom.</li>
              <li>If the location is not properly prepared for inventory (mixed up product/pricing issues), do not fix it. Inform the inventory manager so we can provide the store personnel the opportunity to prep the section for a good count.</li>
              <li>Yellow Audit Tags: Do not pre tag your location. Tag as you count.</li>
            </ol>
          </div>

          <!-- NON-COUNT PRODUCTS SECTION -->
          <div class="section-title">Non-Count Products</div>
          <div class="content">
            ${client.noncount && client.noncount.trim() ? `
            <div class="content">
              ${client.noncount.split('\n').map(line => 
                line.trim() ? `<div class="bullet-list"><li>${line.replace(/^[•\-\*]\s*/, '')}</li></div>` : ''
              ).join('')}
            </div>
            ` : '<div class="content"><div class="bullet-list"><li>N/A</li></div></div>'}
          </div>

          <!-- REPORTS SECTION -->
          <div class="section-title">REPORTS</div>

          <div class="subsection-title">PROGRESSIVE REPORTS</div>
          <div class="content">
            <div class="sub-subsection-title">POSTING SHEETS</div>
            <ul class="bullet-list">
              <li>Posting sheets are to be printed progressively for every area. Be sure to continually communicate with the store manager to get their feedback on any issues they may have or any recounts they may want. This will help eliminate a lengthy wrap.</li>
              <li>The inventory manager should start checking and verifying the counts as soon as they are complete. Provide the posting sheets progressively for the manager to walk as the inventory progresses.</li>
              <li><span class="italic-bold">All posting sheets must be reviewed by the inventory manager before they can be posted. Any large discrepancies in the comparison of the current vs prior should be investigated/recounted PRIOR to giving the posting sheets to the store manager.</span></li>
            </ul>
            
            <div class="sub-subsection-title">UTILITY REPORTS</div>
            <ul class="bullet-list">
              <li>Verify 204-7 Report items, especially zero prices. Correct as needed. Verify items found on discrepancy report are legitimate before finalizing.</li>
            </ul>
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
          </div>

          <div class="subsection-title">FINAL REPORTS</div>
          <div class="content">
            ${client.Fin_Rep && client.Fin_Rep.trim() ? `
            <div class="content">
              ${client.Fin_Rep.split('\n').map(line => 
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
          </div>
        </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    if (!clientData) {
      Alert.alert('Error', 'No client data available');
      return;
    }
    
    setGenerating(true);
    
    try {
      const html = await generateHTML(clientData);
      
      // Check if running on web
      if (Platform.OS === 'web') {
        console.log('Web platform detected, using web PDF generation...');
        await generateWebPDF(html, `account-instructions-${clientData.name}.pdf`);
        setPdfUri('web-pdf-generated');
        setHtmlContent(html);
        setShowPDFViewer(true);
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        // Store the PDF URI and HTML content, then show the viewer
        setPdfUri(uri);
        setHtmlContent(html);
        setShowPDFViewer(true);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message);
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const generateWebPDF = async (htmlContent, filename) => {
    try {
      // Create a new window with the HTML content
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load
      printWindow.onload = () => {
        // Trigger print dialog
        printWindow.print();
        
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
      return { uri: 'web-pdf-generated' };
    } catch (error) {
      console.error('Error generating web PDF:', error);
      throw error;
    }
  };

  // Show PDF viewer if PDF has been generated
  if (showPDFViewer && pdfUri && htmlContent && clientData) {
    console.log('Passing email to PDFViewer:', clientData.email);
    return (
      <PDFViewer 
        pdfUri={pdfUri}
        clientName={clientData.name}
        clientEmail={clientData.email}
        htmlContent={htmlContent}
        onBack={() => {
          setShowPDFViewer(false);
          setPdfUri(null);
          setHtmlContent(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading client data from Firebase...</Text>
      </View>
    );
  }

  if (!clientData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load client data</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Generate PDF</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.clientName}>Client: {clientData.name}</Text>
        <Text style={styles.instructionText}>
          Click the button below to generate a PDF with all account instructions for this client.
        </Text>
      </View>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={generatePDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate PDF</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FirebasePDFGenerator;
