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
  Image
} from 'react-native';
import { db } from '../firebase-config';
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

      Alert.alert(
        'Success!',
        `Final processing data saved and PDF copied to device for ${clientData.name}.`,
        [
          { text: 'OK' }
        ]
      );
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
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
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

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveToDevice}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Copy to Device'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.emailButton, saving && styles.saveButtonDisabled]}
          onPress={handleEmailToClient}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Emailing...' : 'Email to Client'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.finalizeButton}
          onPress={onComplete}
        >
          <Text style={styles.saveButtonText}>Finalize</Text>
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
  content: {
    flex: 1,
    padding: 20,
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
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6f42c1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  emailButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  finalizeButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FinalProcessingForm;
