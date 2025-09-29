import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

const PDFGenerator = ({ clientData, onComplete }) => {
  const generateHTML = (client) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${client.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #007AFF;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
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
              page-break-inside: avoid;
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
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">MSI</div>
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
            <div class="section-title">Inventory Procedures</div>
            <div class="instructions-list">${client.Inv_Proc}</div>
          </div>
          ` : ''}

          ${client.Audits ? `
          <div class="section">
            <div class="section-title">Audits</div>
            <div class="instructions-list">${client.Audits}</div>
          </div>
          ` : ''}

          ${client.Inv_Flow ? `
          <div class="section">
            <div class="section-title">Inventory Flow</div>
            <div class="instructions-list">${client.Inv_Flow}</div>
          </div>
          ` : ''}

          ${client.noncount ? `
          <div class="section">
            <div class="section-title">Non-Count Products</div>
            <div class="instructions-list">${client.noncount}</div>
          </div>
          ` : ''}

          ${client['Team-Instr'] ? `
          <div class="section">
            <div class="section-title">Pre-Inventory Team Instructions</div>
            <div class="instructions-list">${client['Team-Instr']}</div>
          </div>
          ` : ''}

          ${client.Prog_Rep ? `
          <div class="section">
            <div class="section-title">Progressive Reports</div>
            <div class="instructions-list">${client.Prog_Rep}</div>
          </div>
          ` : ''}

          ${client.Finalize ? `
          <div class="section">
            <div class="section-title">Finalizing the Count</div>
            <div class="warning-box">
              <div class="warning-text">VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER</div>
            </div>
            <div class="instructions-list">${client.Finalize}</div>
          </div>
          ` : ''}

          ${client.Fin_Rep ? `
          <div class="section">
            <div class="section-title">Final Reports</div>
            <div class="instructions-list">${client.Fin_Rep}</div>
          </div>
          ` : ''}

          ${client.Processing ? `
          <div class="section">
            <div class="section-title">Final Processing</div>
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
        </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    try {
      const html = generateHTML(clientData);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      Alert.alert(
        'PDF Generated!',
        `Account Instructions PDF has been generated for ${clientData.name}`,
        [
          { text: 'OK', onPress: onComplete }
        ]
      );

      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.generateButton} onPress={generatePDF}>
        <Text style={styles.generateButtonText}>Generate Account Instructions PDF</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
});

export default PDFGenerator;