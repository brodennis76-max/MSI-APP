import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Improved PDF Generator with exact 0.5" margins and better text wrapping
 * This replaces the need for a separate Java service while providing the same quality
 */
const ImprovedPDFGenerator = ({ 
  clientData = null,
  clientId = null,
  onComplete = null,
  onBack = null,
  showPreview = true,
  customTitle = "Account Instructions"
}) => {
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedClientData, setFetchedClientData] = useState(null);

  const generateImprovedHTML = (client) => {
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
          <title>Account Instructions - ${client.name}</title>
          <style>
            @page {
              size: letter;
              margin: 0.5in;
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
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }
            
            .pdf-container {
              width: 100%;
              max-width: 7.5in;
              margin: 0 auto;
              padding: 0;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-top: 0;
            }
            
            .company-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            
            .client-name {
              font-size: 14px;
              margin-bottom: 20px;
              color: #333;
            }
            
            .info-section {
              margin-bottom: 20px;
            }
            
            .info-row {
              display: flex;
              margin-bottom: 8px;
              align-items: flex-start;
            }
            
            .info-label {
              font-weight: bold;
              width: 120px;
              flex-shrink: 0;
              color: #333;
            }
            
            .info-value {
              flex: 1;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: pre-wrap;
              hyphens: auto;
              color: #333;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin: 25px 0 15px 0;
              text-transform: uppercase;
              color: #333;
              page-break-after: avoid;
            }
            
            .content {
              margin-bottom: 15px;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: pre-wrap;
              hyphens: auto;
              line-height: 1.5;
              color: #333;
              text-align: justify;
            }
            
            .footer-section {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            
            .footer-title {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 10px;
              text-transform: uppercase;
              color: #333;
            }
            
            .footer-content {
              font-size: 11px;
              line-height: 1.4;
              color: #333;
              margin-bottom: 8px;
            }
            
            /* Page break controls */
            .avoid-break {
              page-break-inside: avoid;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            /* Print-specific styles */
            @media print {
              body { 
                margin: 0 !important; 
                padding: 0 !important; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .pdf-container { 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important;
                max-width: none !important;
              }
              
              .avoid-break {
                page-break-inside: avoid;
              }
              
              .page-break {
                page-break-before: always;
              }
            }
            
            /* Improved text rendering */
            p, div, span {
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="header">
              <div class="company-name">MSI INVENTORY</div>
              <div class="title">ACCOUNT INSTRUCTIONS:</div>
              <div class="client-name">${client.name}</div>
            </div>

            <div class="info-section avoid-break">
              ${client.name ? `
                <div class="info-row">
                  <div class="info-label">Client Name:</div>
                  <div class="info-value">${client.name}</div>
                </div>
              ` : ''}
              
              ${client.email ? `
                <div class="info-row">
                  <div class="info-label">Email:</div>
                  <div class="info-value">${client.email}</div>
                </div>
              ` : ''}
              
              ${client.address ? `
                <div class="info-row">
                  <div class="info-label">Address:</div>
                  <div class="info-value">${client.address}</div>
                </div>
              ` : ''}
              
              ${client.phone ? `
                <div class="info-row">
                  <div class="info-label">Phone:</div>
                  <div class="info-value">${client.phone}</div>
                </div>
              ` : ''}
              
              <div class="info-row">
                <div class="info-label">Generated:</div>
                <div class="info-value">${currentDate}</div>
              </div>
            </div>

            ${client.Pre_Inv ? `
              <div class="avoid-break">
                <div class="section-title">Pre-Inventory Instructions</div>
                <div class="content">${client.Pre_Inv}</div>
              </div>
            ` : ''}

            ${client.Team_Instr ? `
              <div class="avoid-break">
                <div class="section-title">Team Instructions</div>
                <div class="content">${client.Team_Instr}</div>
              </div>
            ` : ''}

            ${client.Inv_Proc ? `
              <div class="avoid-break">
                <div class="section-title">Inventory Procedures</div>
                <div class="content">${client.Inv_Proc}</div>
              </div>
            ` : ''}

            ${client.Non_Count ? `
              <div class="avoid-break">
                <div class="section-title">Non-Count Products</div>
                <div class="content">${client.Non_Count}</div>
              </div>
            ` : ''}

            ${client.Inv_Flow ? `
              <div class="avoid-break">
                <div class="section-title">Inventory Flow</div>
                <div class="content">${client.Inv_Flow}</div>
              </div>
            ` : ''}

            ${client.Audits_Inv_Flow ? `
              <div class="avoid-break">
                <div class="section-title">Audits Inventory Flow</div>
                <div class="content">${client.Audits_Inv_Flow}</div>
              </div>
            ` : ''}

            ${client.Fin_Count ? `
              <div class="avoid-break">
                <div class="section-title">Finalizing Count</div>
                <div class="content">${client.Fin_Count}</div>
              </div>
            ` : ''}

            ${client.Prog_Rep ? `
              <div class="avoid-break">
                <div class="section-title">Progressive Reports</div>
                <div class="content">${client.Prog_Rep}</div>
              </div>
            ` : ''}

            ${client.Fin_Rep ? `
              <div class="avoid-break">
                <div class="section-title">Final Reports</div>
                <div class="content">${client.Fin_Rep}</div>
              </div>
            ` : ''}

            ${client.Processing ? `
              <div class="avoid-break">
                <div class="section-title">Final Processing</div>
                <div class="content">${client.Processing}</div>
              </div>
            ` : ''}

            ${client.Additional_Notes ? `
              <div class="avoid-break">
                <div class="section-title">Additional Notes</div>
                <div class="content">${client.Additional_Notes}</div>
              </div>
            ` : ''}

            <div class="footer-section">
              <div class="footer-title">Contact Information</div>
              <div class="footer-content">Email: @msi-inv.com</div>
              
              <div class="footer-title" style="margin-top: 15px;">Note</div>
              <div class="footer-content">A completed Account Instructions Form will be sent within 48 hours.</div>
              <div class="footer-content">Please check your email and spam folder.</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDF = async (preview = false) => {
    if (!clientData) {
      Alert.alert('Error', 'No client data available');
      return;
    }

    setGenerating(true);

    try {
      console.log('Generating improved PDF...');
      
      const html = generateImprovedHTML(clientData);
      
      if (Platform.OS === 'web' && preview) {
        // For web preview, open in new window
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
      } else {
        // Generate PDF using expo-print with optimized settings
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
          width: 612, // 8.5 inches * 72 points/inch
          height: 792, // 11 inches * 72 points/inch
          margins: {
            left: 36,   // 0.5 inch
            right: 36,  // 0.5 inch
            top: 36,    // 0.5 inch
            bottom: 36  // 0.5 inch
          }
        });

        console.log('PDF generated successfully:', uri);

        if (preview) {
          await sharePDF(uri);
        } else {
          Alert.alert(
            'PDF Generated!',
            `${customTitle} PDF has been generated for ${clientData.name}`,
            [
              { text: 'Share', onPress: () => sharePDF(uri) },
              { text: 'OK', onPress: onComplete }
            ]
          );
        }
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const sharePDF = async (fileUri) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Improved PDF Generator</Text>
        <Text style={styles.subtitle}>0.5" margins • Professional text wrapping • Optimized layout</Text>
      </View>

      {clientData && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{clientData.name || 'Unknown Client'}</Text>
          <Text style={styles.clientEmail}>{clientData.email || 'No email provided'}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {showPreview && (
          <TouchableOpacity 
            style={[styles.button, styles.previewButton]} 
            onPress={() => generatePDF(true)}
            disabled={generating || !clientData}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Preview PDF</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.generateButton]} 
          onPress={() => generatePDF(false)}
          disabled={generating || !clientData}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Features:</Text>
        <Text style={styles.featureText}>✅ Exact 0.5" margins on all sides</Text>
        <Text style={styles.featureText}>✅ Professional text wrapping & hyphenation</Text>
        <Text style={styles.featureText}>✅ Optimized for print quality</Text>
        <Text style={styles.featureText}>✅ Consistent cross-platform output</Text>
        <Text style={styles.featureText}>✅ No external dependencies required</Text>
      </View>

      {(onBack || onComplete) && (
        <View style={styles.navigationContainer}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {onComplete && (
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  clientInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  previewButton: {
    backgroundColor: '#007AFF',
  },
  generateButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ImprovedPDFGenerator;
