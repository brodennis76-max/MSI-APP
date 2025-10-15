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
import RichTextEditor from './RichTextEditor';
// PDF generation moved to CompletionScreen
// Removed PDF-related imports

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

      // PDF generation removed

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
      console.log('Starting email to client process (PDF removed)...');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data
      console.log('Updating client data...');
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // PDF generation removed

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
      console.log('🔥 handlePrintReports: PDF generation removed');
      const clientRef = doc(db, 'clients', clientData.id);

      // Update the client with final processing data first
      console.log('🔥 handlePrintReports: Updating client data...');
      await updateDoc(clientRef, {
        Processing: processingText,
        updatedAt: new Date(),
      });

      // PDF generation removed
    } catch (error) {
      console.error('🔥 handlePrintReports ERROR (PDF removed):', error);
      console.error('🔥 Error code:', error.code);
      console.error('🔥 Error message:', error.message);
      console.error('🔥 Error stack:', error.stack);
      if (Platform.OS === 'web') {
        window.alert(`Failed to generate reports: ${error.message}. Please try again.`);
      } else {
        Alert.alert('Error', `Failed to generate reports: ${error.message}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // All PDF helper functions removed

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
          
          <RichTextEditor
            value={processingText}
            onChange={handleInputChange}
          />
        </View>
      </ScrollView>

      {/* Single row with all three buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* PDF generation moved to CompletionScreen */}

        <TouchableOpacity style={styles.completeButton} onPress={async () => {
          // Save data first, then navigate back to dashboard
          await handleSaveData();
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
