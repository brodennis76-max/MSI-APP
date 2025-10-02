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
import { doc, updateDoc } from 'firebase/firestore';

const FinalReportsForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [finRepText, setFinRepText] = useState('');

  // Ref for keyboard navigation
  const finRepRef = React.useRef(null);

  const handleInputChange = (value) => {
    // Store raw input without formatting for better typing experience
    setFinRepText(value);
  };

  const handleInputBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(finRepText);
    setFinRepText(formattedValue);
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
      
      // Update the client with final reports
      await updateDoc(clientRef, {
        Fin_Rep: finRepText,
        updatedAt: new Date(),
      });

      Alert.alert(
        'Success!', 
        `Final reports saved for ${clientData.name}`,
        [
          { text: 'OK', onPress: onComplete }
        ]
      );
    } catch (error) {
      console.error('Error saving final reports:', error);
      Alert.alert('Error', 'Failed to save final reports. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Final Reports</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Final Reports for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Final Reports</Text>
          <Text style={styles.helperText}>Enter final report information. Each item on a new line - bullet points will be added automatically.</Text>
          
          <TextInput
            ref={finRepRef}
            style={styles.textArea}
            value={finRepText}
            onChangeText={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Enter final report details on a new line"
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
    backgroundColor: '#28a745',
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

export default FinalReportsForm;



















