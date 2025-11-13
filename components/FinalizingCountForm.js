import React, { useState, useEffect } from 'react';
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
import { doc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import { sanitizeHtmlForFirebase } from '../utils/sanitizeHtmlForFirebase';

const FinalizingCountForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  
  // Get store type-specific default content
  const getDefaultContentByStoreType = (storeType) => {
    switch (storeType) {
      case 'Grocery':
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Store personnel will be provided 30 minutes to review final posting sheet. Please be flexible on this if there are accuracy issues with the count. Store personnel should not be waiting to perform audits. Utilize the 20 minute rule to gently remind them to utilize the iPads during the count to help prevent a long wrap time.`;
      
      case 'Convenience':
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.

1. INTERIM 201 Price Exception Report
2. INTERIM 202 Quantity Exception Report
3. INTERIM 130 Location Report
4. INTERIM 110 Category Report`;
      
      case 'Clothing':
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.

1. INTERIM 201 Price Exception Report
2. INTERIM 202 Quantity Exception Report
3. INTERIM 130 Location Report
4. INTERIM 110 Category Report`;
      
      case 'Hardware':
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.

1. INTERIM 201 Price Exception Report
2. INTERIM 202 Quantity Exception Report
3. INTERIM 130 Location Report
4. INTERIM 110 Category Report`;
      
      case 'Other':
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.

1. INTERIM 201 Price Exception Report
2. INTERIM 202 Quantity Exception Report
3. INTERIM 130 Location Report
4. INTERIM 110 Category Report`;
      
      default:
        return `VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER.
Review the following reports with the store manager/DM and determine if 3 more recounts are needed. If so, perform the recounts. If the recounts come back good, print the final reports and book the inventory. If the recounts prove a discrepancy, additional recounts will be required to satisfy the accuracy of the inventory.

1. INTERIM 201 Price Exception Report
2. INTERIM 202 Quantity Exception Report
3. INTERIM 130 Location Report
4. INTERIM 110 Category Report`;
    }
  };

  const [finalizeText, setFinalizeText] = useState(
    clientData?.Finalize || getDefaultContentByStoreType(clientData?.storeType || clientData?.accountType || 'Convenience')
  );

  // Update state when clientData changes
  useEffect(() => {
    if (clientData?.Finalize) {
      setFinalizeText(clientData.Finalize);
    } else {
      // If no Finalize data, use default based on store type
      const defaultText = getDefaultContentByStoreType(clientData?.storeType || clientData?.accountType || 'Convenience');
      setFinalizeText(defaultText);
    }
  }, [clientData?.Finalize, clientData?.storeType, clientData?.accountType]);

  // Ref for keyboard navigation
  const finalizeRef = React.useRef(null);

  const handleInputChange = (value) => {
    // Store raw input without formatting for better typing experience
    setFinalizeText(value);
  };

  const handleInputBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(finalizeText);
    setFinalizeText(formattedValue);
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

  const handleSave = async () => {
    setSaving(true);

    try {
      const clientRef = doc(db, 'clients', clientData.id);
      
      // Sanitize HTML before saving to Firebase - remove all inline styles and unnecessary attributes
      const sanitizedFinalize = sanitizeHtmlForFirebase(finalizeText);
      
      // Update the client with finalizing count data
      await updateDoc(clientRef, {
        Finalize: sanitizedFinalize,
        updatedAt: new Date(),
      });

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        // For web, use native browser alert and call onComplete directly
        window.alert(`Success! Finalizing count data saved for ${clientData.name}`);
        console.log('FinalizingCountForm: About to call onComplete()');
        console.log('FinalizingCountForm: onComplete function:', onComplete);
        if (onComplete) {
          onComplete();
          console.log('FinalizingCountForm: onComplete() called successfully');
        } else {
          console.error('FinalizingCountForm: onComplete is null/undefined!');
        }
      } else {
        // For mobile, use React Native Alert
        Alert.alert(
          'Success!', 
          `Finalizing count data saved for ${clientData.name}`,
          [
            { text: 'OK', onPress: () => {
              console.log('FinalizingCountForm: Mobile alert OK pressed, calling onComplete');
              if (onComplete) {
                onComplete();
              }
            }}
          ]
        );
      }
    } catch (error) {
      console.error('🔥 FIREBASE WRITE ERROR - Failed to save finalizing count data:', error);
      console.error('🔥 Error code:', error.code);
      console.error('🔥 Error message:', error.message);
      console.error('🔥 Platform:', Platform.OS);
      console.error('🔥 Client ID:', clientData.id);
      console.error('🔥 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
      Alert.alert('Error', `Failed to save finalizing count data: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Finalizing the Count</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Finalizing the Count for {clientData.name}</Text>
        
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>VERIFY ALL REPORTS BALANCE BEFORE GIVING THEM TO THE MANAGER</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Finalizing Count Details</Text>
          <Text style={styles.helperText}>Store-type-specific finalizing procedures are pre-populated below. You can modify, add to, or customize this content as needed. Each item on a new line - bullet points will be added automatically.</Text>
          
          <RichTextEditor
            value={finalizeText}
            onChange={handleInputChange}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.backButtonBottom}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Text>
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
  warningContainer: {
    backgroundColor: '#dc3545',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#c82333',
  },
  warningText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
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
    gap: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FinalizingCountForm;









