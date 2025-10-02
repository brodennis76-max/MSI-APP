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
      console.log('Generating reports for printing...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data first
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // Get the complete client data for PDF generation
      const clientDoc = await getDoc(clientRef);
      const completeClientData = { id: clientData.id, ...clientDoc.data() };

      // Generate PDF
      const pdfUri = await generateUniversalPDF(completeClientData);

      if (Platform.OS === 'web') {
        // For web, show success message - print dialog should open automatically
        window.alert(`Reports generated successfully for ${clientData.name}! Print dialog will open.`);
      } else {
        // For mobile, use sharing to allow printing
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Print Account Instructions for ${clientData.name}`,
        });
        Alert.alert('Success!', `Reports generated and ready to print for ${clientData.name}!`);
      }
    } catch (error) {
      console.error('Error generating reports:', error);
      if (Platform.OS === 'web') {
        window.alert(`Failed to generate reports: ${error.message}. Please try again.`);
      } else {
        Alert.alert('Error', `Failed to generate reports: ${error.message}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // PDF generation now handled by generateUniversalPDF utility


  // HTML generation now handled by generateUniversalPDF utility
  // (removed large generateHTMLContent function)


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
            // Save data first, then generate PDF
            await handleSaveData();
            await handlePrintReports();
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
