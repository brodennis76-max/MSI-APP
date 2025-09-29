import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  Share
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

const PDFViewer = ({ pdfUri, clientName, clientEmail, onBack, htmlContent }) => {
  
  const handleSaveToDevice = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${clientName} Account Instructions`,
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to save PDF to device');
    }
  };

  const handlePrintPDF = async () => {
    try {
      await Print.printAsync({
        uri: pdfUri,
        printerUrl: undefined, // Let user choose printer
      });
    } catch (error) {
      console.error('Error printing PDF:', error);
      Alert.alert('Error', 'Failed to print PDF. Make sure you have a printer configured.');
    }
  };

  const handleEmailToClient = async () => {
    try {
      console.log('Client email value:', clientEmail);
      console.log('Client email type:', typeof clientEmail);
      console.log('Client email trimmed:', clientEmail ? clientEmail.trim() : 'null/undefined');
      
      if (!clientEmail || clientEmail.trim() === '') {
        Alert.alert(
          'No Email Address', 
          'This client does not have an email address on file. Please add an email address in the client information first.',
          [{ text: 'OK' }]
        );
        return;
      }

      const subject = `Account Instructions - ${clientName}`;
      const body = `Dear ${clientName},\n\nPlease find attached your Account Instructions document.\n\nBest regards,\nMSI Inventory Service Corporation`;
      
      const emailUrl = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        // Fallback to sharing
        await Share.share({
          title: subject,
          message: `${body}\n\nEmail: ${clientEmail}`,
          url: pdfUri,
        });
      }
    } catch (error) {
      console.error('Error emailing PDF:', error);
      Alert.alert('Error', 'Failed to open email client. You can manually attach the PDF file.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Account Instructions</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pdfInfo}>
        <Text style={styles.pdfTitle}>Account Instructions for {clientName}</Text>
        <Text style={styles.pdfSubtitle}>PDF Generated Successfully</Text>
      </View>

      <View style={styles.pdfContainer}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          scalesPageToFit={true}
          startInLoadingState={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error: ', nativeEvent);
            Alert.alert('Error', 'Failed to load content. Please try again.');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error: ', nativeEvent);
            Alert.alert('Error', 'Failed to load content. Please try again.');
          }}
        />
      </View>

      <View style={styles.bottomActions}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveToDevice}
          >
            <Text style={styles.actionButtonText}>💾 Save to Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={handlePrintPDF}
          >
            <Text style={styles.actionButtonText}>🖨️ Print PDF</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.emailButton]}
          onPress={handleEmailToClient}
        >
          <Text style={styles.actionButtonText}>📧 Email to Client</Text>
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
  pdfInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  pdfSubtitle: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  pdfContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  webview: {
    flex: 1,
    borderRadius: 8,
  },
  bottomActions: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  printButton: {
    backgroundColor: '#6c757d',
  },
  emailButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PDFViewer;
