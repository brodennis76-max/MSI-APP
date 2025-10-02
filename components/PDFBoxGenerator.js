import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const PDFBoxGenerator = ({ clientData, onComplete, onBack }) => {
  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  // Configuration - Update this URL to match your PDFBox service
  const PDF_SERVICE_URL = Platform.OS === 'web' 
    ? 'http://localhost:8080/api/pdf' 
    : 'http://your-server-ip:8080/api/pdf'; // Replace with your actual server IP

  const generatePDF = async () => {
    if (!clientData) {
      Alert.alert('Error', 'No client data available');
      return;
    }

    setGenerating(true);

    try {
      console.log('Generating PDF with PDFBox service...');
      console.log('Client data:', clientData);

      // Prepare the request payload
      const requestPayload = {
        name: clientData.name || '',
        email: clientData.email || '',
        address: clientData.address || '',
        phone: clientData.phone || '',
        Pre_Inv: clientData.Pre_Inv || '',
        Team_Instr: clientData.Team_Instr || '',
        Inv_Proc: clientData.Inv_Proc || '',
        Non_Count: clientData.Non_Count || '',
        Inv_Flow: clientData.Inv_Flow || '',
        Audits_Inv_Flow: clientData.Audits_Inv_Flow || '',
        Fin_Count: clientData.Fin_Count || '',
        Prog_Rep: clientData.Prog_Rep || '',
        Fin_Rep: clientData.Fin_Rep || '',
        Processing: clientData.Processing || '',
        Additional_Notes: clientData.Additional_Notes || ''
      };

      console.log('Sending request to PDFBox service...');

      // Make request to PDFBox service
      const response = await fetch(`${PDF_SERVICE_URL}/generate`, {
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
        // For web platform, create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `account-instructions-${clientData.name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'PDF downloaded successfully!');
      } else {
        // For mobile platforms, save to file system
        const base64Data = await blobToBase64(pdfBlob);
        const fileUri = `${FileSystem.documentDirectory}account-instructions-${clientData.name}.pdf`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setPdfUri(fileUri);
        
        Alert.alert(
          'PDF Generated!',
          `Account Instructions PDF has been generated for ${clientData.name}`,
          [
            { text: 'Share', onPress: () => sharePDF(fileUri) },
            { text: 'OK' }
          ]
        );
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

  const previewPDF = async () => {
    if (!clientData) {
      Alert.alert('Error', 'No client data available');
      return;
    }

    setGenerating(true);

    try {
      console.log('Generating PDF preview with PDFBox service...');

      const requestPayload = {
        name: clientData.name || '',
        email: clientData.email || '',
        address: clientData.address || '',
        phone: clientData.phone || '',
        Pre_Inv: clientData.Pre_Inv || '',
        Team_Instr: clientData.Team_Instr || '',
        Inv_Proc: clientData.Inv_Proc || '',
        Non_Count: clientData.Non_Count || '',
        Inv_Flow: clientData.Inv_Flow || '',
        Audits_Inv_Flow: clientData.Audits_Inv_Flow || '',
        Fin_Count: clientData.Fin_Count || '',
        Prog_Rep: clientData.Prog_Rep || '',
        Fin_Rep: clientData.Fin_Rep || '',
        Processing: clientData.Processing || '',
        Additional_Notes: clientData.Additional_Notes || ''
      };

      const response = await fetch(`${PDF_SERVICE_URL}/preview`, {
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

      const pdfBlob = await response.blob();
      
      if (Platform.OS === 'web') {
        // For web, open in new tab
        const url = window.URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      } else {
        // For mobile, save and share
        const base64Data = await blobToBase64(pdfBlob);
        const fileUri = `${FileSystem.documentDirectory}preview-${clientData.name}.pdf`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await sharePDF(fileUri);
      }

    } catch (error) {
      console.error('Error generating PDF preview:', error);
      Alert.alert('Error', `Failed to generate PDF preview: ${error.message}`);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PDFBox PDF Generator</Text>
        <Text style={styles.subtitle}>Generate high-quality PDFs using Apache PDFBox</Text>
      </View>

      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{clientData?.name || 'Unknown Client'}</Text>
        <Text style={styles.clientEmail}>{clientData?.email || 'No email provided'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.previewButton]} 
          onPress={previewPDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Preview PDF</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.generateButton]} 
          onPress={generatePDF}
          disabled={generating}
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
      </View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {onComplete && (
          <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
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

export default PDFBoxGenerator;
