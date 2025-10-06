import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

const PDFPreview = ({ clientData, onBack, onGeneratePDF }) => {
  const [showPreview, setShowPreview] = useState(true);

  const generateHTML = (client) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${client.name}</title>
          <style>
            @page {
              size: letter;
              margin: 0.5in;
            }
            
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.6;
              color: #2c3e50;
              background: white;
              width: 8.5in;
              min-height: 11in;
            }
            
            .pdf-container {
              width: 7.5in;
              min-height: 9in;
              padding: 1in;
              box-sizing: border-box;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
              color: white;
              padding: 30px 20px;
              margin-bottom: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .company-name {
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .client-name {
              font-size: 24px;
              font-weight: bold;
              margin-top: 10px;
            }
            
            .generated-date {
              font-size: 12px;
              opacity: 0.8;
              margin-top: 10px;
            }
            
            .content {
              max-width: 800px;
              margin: 0 auto;
              padding: 0 20px;
            }
            
            .section {
              margin-bottom: 30px;
            }
            
            /* Avoid cutting off elements */
            .avoid-break {
              page-break-inside: avoid;
            }
            
            /* Force new page */
            .page-break {
              page-break-before: always;
            }
            
            @media print {
              .no-print { display: none; }
              .content { width: 100%; }
              body { margin: 0; padding: 0; }
              .pdf-container { margin: 0; padding: 0; }
            }
            
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: #007AFF;
              border-bottom: 3px solid #007AFF;
              padding-bottom: 8px;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-item {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #007AFF;
            }
            
            .info-label {
              font-weight: bold;
              color: #555;
              font-size: 14px;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .info-value {
              color: #2c3e50;
              font-size: 16px;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }
            
            .instructions-box {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-left: 4px solid #28a745;
              padding: 20px;
              border-radius: 8px;
              margin: 15px 0;
            }
            
            .instructions-content {
              color: #2c3e50;
              line-height: 1.8;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }
            
            .warning-box {
              background: #fff3cd;
              border: 2px solid #ffc107;
              border-left: 6px solid #f39c12;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            
            .warning-text {
              color: #856404;
              font-weight: bold;
              font-size: 18px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .footer {
              margin-top: 50px;
              padding: 30px;
              background: #f8f9fa;
              border-radius: 10px;
              text-align: center;
              border-top: 3px solid #007AFF;
            }
            
            .footer-title {
              font-size: 18px;
              font-weight: bold;
              color: #007AFF;
              margin-bottom: 15px;
            }
            
            .contact-info {
              color: #6c757d;
              line-height: 1.6;
            }
            
            .email-highlight {
              color: #007AFF;
              font-weight: bold;
            }
            
            @media print {
              body {
                margin: 0 !important;
                padding: 0 !important;
              }
              .pdf-container {
                margin: 0 !important;
                padding: 1in !important; /* Chrome-friendly 1-inch margins */
                width: 6.5in !important;
                box-sizing: border-box !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="header">
            <div class="company-name">MSI INVENTORY</div>
            <div class="client-name">Account Instructions</div>
          </div>

          <div class="content">
            <div class="section">
              <div class="section-title">Client Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Inventory Type</div>
                  <div class="info-value">${client.inventoryType || client.accountType || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">PIC (Pre-Inventory Call)</div>
                  <div class="info-value">${client.PIC || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Start Time</div>
                  <div class="info-value">${client.startTime || client.storeStartTime || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Verification</div>
                  <div class="info-value">${client.verification || 'Not specified'}</div>
                </div>
              </div>
            </div>

            ${client.verification ? `
            <div class="section">
              <div class="section-title">Verification Requirements</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.verification}</div>
              </div>
            </div>
            ` : ''}

            ${client.preInventory ? `
            <div class="section">
              <div class="section-title">Pre-Inventory Instructions</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.preInventory}</div>
              </div>
            </div>
            ` : ''}

            ${client.Inv_Proc ? `
            <div class="section">
              <div class="section-title page-break">Inventory Procedures</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Inv_Proc}</div>
              </div>
            </div>
            ` : ''}

            ${client.Audits ? `
            <div class="section">
              <div class="section-title page-break">Audit Procedures</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Audits}</div>
              </div>
            </div>
            ` : ''}

            ${client.Inv_Flow ? `
            <div class="section">
              <div class="section-title page-break">Inventory Flow</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Inv_Flow}</div>
              </div>
            </div>
            ` : ''}

            ${client.noncount ? `
            <div class="section">
              <div class="section-title page-break">Non-Count Products</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.noncount}</div>
              </div>
            </div>
            ` : ''}

            ${client['Team-Instr'] ? `
            <div class="section">
              <div class="section-title page-break">Team Instructions</div>
              <div class="instructions-box">
                <div class="instructions-content">${client['Team-Instr']}</div>
              </div>
            </div>
            ` : ''}

            ${client.Prog_Rep ? `
            <div class="section">
              <div class="section-title page-break">Progressive Reports</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Prog_Rep}</div>
              </div>
            </div>
            ` : ''}

            ${client.Finalize ? `
            <div class="section">
              <div class="section-title page-break">Finalizing the Count</div>
              <div class="warning-box">
                <div class="warning-text">VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER</div>
              </div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Finalize}</div>
              </div>
            </div>
            ` : ''}

            ${client.Fin_Rep ? `
            <div class="section">
              <div class="section-title page-break">Final Reports</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Fin_Rep}</div>
              </div>
            </div>
            ` : ''}

            ${client.Processing ? `
            <div class="section">
              <div class="section-title page-break">Final Processing</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.Processing}</div>
              </div>
            </div>
            ` : ''}

            ${client.additionalNotes ? `
            <div class="section">
              <div class="section-title page-break">Additional Notes</div>
              <div class="instructions-box">
                <div class="instructions-content">${client.additionalNotes}</div>
              </div>
            </div>
            ` : ''}

            <div class="footer">
              <div class="footer-title">Contact Information</div>
              <div class="contact-info">
                <strong>MSI - Management Services Inc.</strong><br>
                Email: <span class="email-highlight">@msi-inv.com</span><br><br>
                <strong>Important:</strong> A completed Account Instructions Form will be sent to your email within 48 hours. 
                Please check your email and spam folder for correspondence from <span class="email-highlight">@msi-inv.com</span>.
              </div>
            </div>
          </div>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>PDF Preview</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={onGeneratePDF}
        >
          <Text style={styles.generateButtonText}>Generate PDF</Text>
        </TouchableOpacity>
      </View>

          <ScrollView style={styles.content}>
            {Platform.OS === 'web' ? (
              <div 
                dangerouslySetInnerHTML={{ __html: generateHTML(clientData) }}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  overflow: 'auto'
                }}
              />
            ) : (
              <WebView
                source={{ html: generateHTML(clientData) }}
                style={styles.webview}
                scalesPageToFit={true}
              />
            )}
          </ScrollView>
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
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  webview: {
    height: 800,
  },
});

export default PDFPreview;









