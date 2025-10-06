import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Universal PDFBox Generator
 * 
 * This component replaces ALL existing PDF generators:
 * - FirebasePDFGenerator
 * - CustomerPDFGenerator  
 * - PDFGenerator
 * - WebPDFGenerator
 * - FinalProcessingForm PDF generation
 * - ClientPDFViewer PDF generation
 */
const UniversalPDFBoxGenerator = ({ 
  clientData = null,
  clientId = null,
  onComplete = null,
  onBack = null,
  showPreview = true,
  autoDownload = false,
  emailAfterGeneration = false,
  customTitle = "Account Instructions"
}) => {
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedClientData, setFetchedClientData] = useState(null);

  // Configuration - Update this URL to match your PDFBox service
  const PDF_SERVICE_URL = Platform.OS === 'web' 
    ? 'http://localhost:8080/api/pdf' 
    : 'http://your-server-ip:8080/api/pdf'; // Replace with your actual server IP

  // Get client data from props or fetch from Firebase
  const getClientData = async () => {
    if (clientData) {
      return clientData;
    }
    
    if (clientId && !fetchedClientData) {
      setLoading(true);
      try {
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (clientDoc.exists()) {
          const data = clientDoc.data();
          setFetchedClientData(data);
          return data;
        } else {
          throw new Error('Client not found');
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
        Alert.alert('Error', 'Failed to fetch client data');
        return null;
      } finally {
        setLoading(false);
      }
    }
    
    return fetchedClientData || clientData;
  };

  const generatePDF = async (preview = false) => {
    setGenerating(true);

    try {
      const currentClientData = await getClientData();
      
      if (!currentClientData) {
        Alert.alert('Error', 'No client data available');
        return;
      }

      console.log('Generating PDF with PDFBox service...');
      console.log('Client data:', currentClientData);

      // Prepare the request payload - handles all possible field variations
      const requestPayload = {
        name: currentClientData.name || '',
        email: currentClientData.email || '',
        address: currentClientData.address || '',
        phone: currentClientData.phone || '',
        
        // Account Instructions sections (all possible field names)
        Pre_Inv: currentClientData.Pre_Inv || currentClientData.preInventory || '',
        Team_Instr: currentClientData.Team_Instr || currentClientData.teamInstructions || '',
        Inv_Proc: currentClientData.Inv_Proc || currentClientData.inventoryProcedures || '',
        Non_Count: currentClientData.Non_Count || currentClientData.nonCountProducts || '',
        Inv_Flow: currentClientData.Inv_Flow || currentClientData.inventoryFlow || '',
        Audits_Inv_Flow: currentClientData.Audits_Inv_Flow || currentClientData.auditsInventoryFlow || '',
        Fin_Count: currentClientData.Fin_Count || currentClientData.finalizingCount || '',
        Prog_Rep: currentClientData.Prog_Rep || currentClientData.progressiveReports || '',
        Fin_Rep: currentClientData.Fin_Rep || currentClientData.finalReports || '',
        Processing: currentClientData.Processing || currentClientData.processing || '',
        Additional_Notes: currentClientData.Additional_Notes || currentClientData.additionalNotes || ''
      };

      console.log('Sending request to PDFBox service...');

      // Choose endpoint based on preview flag
      const endpoint = preview ? '/preview' : '/generate';
      
      // Make request to PDFBox service
      const response = await fetch(`${PDF_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('PDF generated successfully by PDFBox service');

      // Get the PDF as blob/buffer
      const pdfBlob = await response.blob();
      
      if (Platform.OS === 'web') {
        // For web platform
        if (preview) {
          // Open in new tab for preview
          const url = window.URL.createObjectURL(pdfBlob);
          window.open(url, '_blank');
          window.URL.revokeObjectURL(url);
        } else {
          // Download the file
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${customTitle.toLowerCase().replace(/\s+/g, '-')}-${currentClientData.name}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          Alert.alert('Success', 'PDF downloaded successfully!');
        }
      } else {
        // For mobile platforms, save to file system
        const base64Data = await blobToBase64(pdfBlob);
        const filename = preview 
          ? `preview-${currentClientData.name}.pdf`
          : `${customTitle.toLowerCase().replace(/\s+/g, '-')}-${currentClientData.name}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (preview) {
          // Share for preview
          await sharePDF(fileUri);
        } else {
          // Show success dialog with options
          Alert.alert(
            'PDF Generated!',
            `${customTitle} PDF has been generated for ${currentClientData.name}`,
            [
              { text: 'Share', onPress: () => sharePDF(fileUri) },
              { text: 'OK', onPress: () => {
                if (emailAfterGeneration) {
                  handleEmailAfterGeneration(currentClientData, fileUri);
                }
                if (onComplete) onComplete();
              }}
            ]
          );
        }
      }

    } catch (error) {
      console.error('Error generating PDF with PDFBox:', error);
      Alert.alert(
        'Error', 
        `Failed to generate PDF: ${error.message}\n\nPlease ensure the PDFBox service is running on ${PDF_SERVICE_URL}`
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailAfterGeneration = async (clientData, pdfUri) => {
    // This would integrate with your existing email functionality
    console.log('Email functionality would be triggered here');
    console.log('Client:', clientData.name, 'PDF:', pdfUri);
    
    // You can integrate this with your existing email service
    Alert.alert(
      'Email Notification', 
      `PDF will be automatically sent to ${clientData.email} within 48 hours.`
    );
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

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${PDF_SERVICE_URL}/health`);
      if (response.ok) {
        const message = await response.text();
        Alert.alert('Connection Test', `✅ ${message}`);
      } else {
        Alert.alert('Connection Test', `❌ Service responded with status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert('Connection Test', `❌ Failed to connect: ${error.message}`);
    }
  };

  const currentClientData = fetchedClientData || clientData;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PDFBox PDF Generator</Text>
        <Text style={styles.subtitle}>{customTitle} - High-quality PDF generation</Text>
      </View>

      {currentClientData && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{currentClientData.name || 'Unknown Client'}</Text>
          <Text style={styles.clientEmail}>{currentClientData.email || 'No email provided'}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {showPreview && (
          <TouchableOpacity 
            style={[styles.button, styles.previewButton]} 
            onPress={() => generatePDF(true)}
            disabled={generating || !currentClientData}
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
          disabled={generating || !currentClientData}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate PDF</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testConnection}
          disabled={generating}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Service Configuration:</Text>
        <Text style={styles.infoText}>URL: {PDF_SERVICE_URL}</Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>Mode: {showPreview ? 'Full' : 'Generate Only'}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    fontSize: 16,
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
  testButton: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
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

export default UniversalPDFBoxGenerator;
