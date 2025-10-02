import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

const ClientPDFViewer = ({ clientId, onBack }) => {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        setClientData({ id: clientSnap.id, ...clientSnap.data() });
      } else {
        Alert.alert('Error', 'Client not found');
        onBack();
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load client data');
      onBack();
    } finally {
      setLoading(false);
    }
  };

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
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.6;
              color: #333;
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
              border-bottom: 2px solid #007AFF;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #007AFF;
              margin-bottom: 10px;
            }
            .client-name {
              font-size: 20px;
              font-weight: bold;
              color: #2c3e50;
            }
            .section {
              margin-bottom: 25px;
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
              font-size: 18px;
              font-weight: bold;
              color: #007AFF;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            .field {
              margin-bottom: 15px;
            }
            .field-label {
              font-weight: bold;
              color: #555;
              margin-bottom: 5px;
            }
            .field-value {
              background-color: #f8f9fa;
              padding: 10px;
              border-left: 4px solid #007AFF;
              border-radius: 4px;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }
            .instructions-list {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            .warning-box {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-left: 4px solid #f39c12;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .warning-text {
              color: #856404;
              font-weight: bold;
              text-align: center;
              font-size: 16px;
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
            <div class="client-name">Account Instructions for ${client.name}</div>
            <div>Generated on ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="section">
            <div class="section-title">Account Information</div>
            <div class="field">
              <div class="field-label">Client Name:</div>
              <div class="field-value">${client.name}</div>
            </div>
            <div class="field">
              <div class="field-label">Inventory Type:</div>
              <div class="field-value">${client.inventoryType || 'Not specified'}</div>
            </div>
            <div class="field">
              <div class="field-label">PIC (Person in Charge):</div>
              <div class="field-value">${client.PIC || 'Not specified'}</div>
            </div>
            <div class="field">
              <div class="field-label">Start Time:</div>
              <div class="field-value">${client.startTime || 'Not specified'}</div>
            </div>
            <div class="field">
              <div class="field-label">Verification:</div>
              <div class="field-value">${client.verification || 'Not specified'}</div>
            </div>
            <div class="field">
              <div class="field-label">Additional Notes:</div>
              <div class="field-value">${client.additionalNotes || 'None'}</div>
            </div>
          </div>

          ${client.preInventory ? `
          <div class="section">
            <div class="section-title">Pre-Inventory Instructions</div>
            <div class="instructions-list">${client.preInventory}</div>
          </div>
          ` : ''}

          ${client.Inv_Proc ? `
          <div class="section">
            <div class="section-title page-break">Inventory Procedures</div>
            <div class="instructions-list">${client.Inv_Proc}</div>
          </div>
          ` : ''}

          ${client.Audits ? `
          <div class="section">
            <div class="section-title page-break">Audits</div>
            <div class="instructions-list">${client.Audits}</div>
          </div>
          ` : ''}

          ${client.Inv_Flow ? `
          <div class="section">
            <div class="section-title page-break">Inventory Flow</div>
            <div class="instructions-list">${client.Inv_Flow}</div>
          </div>
          ` : ''}

          ${client.noncount ? `
          <div class="section">
            <div class="section-title page-break">Non-Count Products</div>
            <div class="instructions-list">${client.noncount}</div>
          </div>
          ` : ''}

          ${client['Team-Instr'] ? `
          <div class="section">
            <div class="section-title page-break">Pre-Inventory Team Instructions</div>
            <div class="instructions-list">${client['Team-Instr']}</div>
          </div>
          ` : ''}

          ${client.Prog_Rep ? `
          <div class="section">
            <div class="section-title page-break">Progressive Reports</div>
            <div class="instructions-list">${client.Prog_Rep}</div>
          </div>
          ` : ''}

          ${client.Finalize ? `
          <div class="section">
            <div class="section-title page-break">Finalizing the Count</div>
            <div class="warning-box">
              <div class="warning-text">VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER</div>
            </div>
            <div class="instructions-list">${client.Finalize}</div>
          </div>
          ` : ''}

          ${client.Fin_Rep ? `
          <div class="section">
            <div class="section-title page-break">Final Reports</div>
            <div class="instructions-list">${client.Fin_Rep}</div>
          </div>
          ` : ''}

          ${client.Processing ? `
          <div class="section">
            <div class="section-title page-break">Final Processing</div>
            <div class="instructions-list">${client.Processing}</div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value">@msi-inv.com</div>
            </div>
            <div class="field">
              <div class="field-label">Note:</div>
              <div class="field-value">A completed Account Instructions Form will be sent within 48 hours. Please check your email and spam folder.</div>
            </div>
          </div>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    if (!clientData) return;
    
    setGeneratingPDF(true);
    try {
      const html = generateHTML(clientData);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612, // Letter width in points (8.5 inches * 72 points/inch)
        height: 792, // Letter height in points (11 inches * 72 points/inch)
      });

      Alert.alert(
        'PDF Generated!',
        `Account Instructions PDF has been generated for ${clientData.name}`,
        [
          { text: 'OK' }
        ]
      );

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading client data...</Text>
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
        <Text style={styles.headerTitle}>Account Instructions</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.generateButton, generatingPDF && styles.generateButtonDisabled]} 
          onPress={generatePDF}
          disabled={generatingPDF}
        >
          <Text style={styles.generateButtonText}>
            {generatingPDF ? 'Generating PDF...' : 'Generate PDF'}
          </Text>
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
  generateButtonDisabled: {
    backgroundColor: '#ccc',
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
    height: 600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 20,
  },
});

export default ClientPDFViewer;