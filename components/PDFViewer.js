import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  Share,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

const PDFViewer = ({ pdfUri, clientName, clientEmail, onBack, htmlContent }) => {
  
  const handleSaveToDevice = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, regenerate and download the PDF
        if (htmlContent) {
          const { default: jsPDF } = await import('jspdf');
          const html2canvas = (await import('html2canvas')).default;
          
          // Create a temporary container with proper styling
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.top = '-9999px';
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
          
          // Create the content div with proper margins
          const contentDiv = document.createElement('div');
          contentDiv.style.padding = '0.75in';
          contentDiv.style.width = '100%';
          contentDiv.style.boxSizing = 'border-box';
          contentDiv.innerHTML = htmlContent;
          
          tempContainer.appendChild(contentDiv);
          document.body.appendChild(tempContainer);
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: tempContainer.offsetWidth,
            height: tempContainer.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            logging: false
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'in', 'letter');
          const pageWidth = 8.5;
          const pageHeight = 11;
          const margin = 0.75;
          const contentWidth = pageWidth - (2 * margin);
          const contentHeight = pageHeight - (2 * margin);
          
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = margin;
          
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= contentHeight;
          
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= contentHeight;
          }
          
          document.body.removeChild(tempContainer);
          pdf.save(`account-instructions-${clientName}.pdf`);
        } else {
          Alert.alert('Error', 'No PDF content available to save');
        }
      } else {
        // For mobile, use the existing sharing functionality
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Save ${clientName} Account Instructions`,
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
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
