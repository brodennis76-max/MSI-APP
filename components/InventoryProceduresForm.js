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
import AuditsInventoryFlowForm from './AuditsInventoryFlowForm';

const InventoryProceduresForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [additionalProcedures, setAdditionalProcedures] = useState('');
  const [showAuditsInventoryFlow, setShowAuditsInventoryFlow] = useState(false);

  // Ref for keyboard navigation
  const additionalProceduresRef = React.useRef(null);

  const permanentProcedures = [
    "The inventory manager's first task when entering the store is to have a pre-inventory meeting with the store manager. During this meeting they will perform the following function:",
    "• Identify who will be involved with inventory from the store (who will be walking posting sheets, who can answer questions, etc.)",
    "• Communicate the inventory flow.",
    "• Walk the store and discuss any areas that need to be addressed (prep/pricing), cooler and stockroom organization, and any hidden product.",
    "• IF THE STORE IS NOT COUNTABLE CONTACT MSI CORPORATE IMMEDIATELY TO CANCEL THE INVENTORY."
  ];

  const handleInputChange = (value) => {
    // Store raw input without formatting for better typing experience
    setAdditionalProcedures(value);
  };

  const handleInputBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(additionalProcedures);
    setAdditionalProcedures(formattedValue);
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
      
      // Combine permanent procedures with additional procedures
      const combinedProcedures = [
        ...permanentProcedures,
        ...(additionalProcedures.trim() ? [additionalProcedures] : [])
      ].join('\n\n');
      
      // Update the client with inventory procedures
      await updateDoc(clientRef, {
        Inv_Proc: combinedProcedures,
        updatedAt: new Date(),
      });

      Alert.alert(
        'Success!', 
        `Inventory procedures saved for ${clientData.name}`,
        [
          { text: 'OK', onPress: () => setShowAuditsInventoryFlow(true) }
        ]
      );
    } catch (error) {
      console.error('Error saving inventory procedures:', error);
      Alert.alert('Error', 'Failed to save inventory procedures. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show Audits & Inventory Flow form if needed
  if (showAuditsInventoryFlow) {
    return (
      <AuditsInventoryFlowForm 
        clientData={clientData}
        onBack={() => setShowAuditsInventoryFlow(false)}
        onComplete={onComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Inventory Procedures</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Inventory Procedures for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Standard Inventory Procedures</Text>
          <Text style={styles.helperText}>These are the standard procedures that must be followed for all inventories.</Text>
          
          <View style={styles.permanentProceduresContainer}>
            {permanentProcedures.map((procedure, index) => (
              <Text key={index} style={[
                styles.permanentProcedureText,
                index === 0 ? styles.introText : styles.bulletText
              ]}>
                {procedure}
              </Text>
            ))}
          </View>

          <Text style={styles.label}>Additional Procedures (Optional)</Text>
          <Text style={styles.helperText}>Enter any additional procedures specific to this client. Each procedure on a new line - bullet points will be added automatically.</Text>
          
          <TextInput
            ref={additionalProceduresRef}
            style={styles.textArea}
            value={additionalProcedures}
            onChangeText={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Enter additional procedures on a new line"
            multiline
            numberOfLines={6}
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
            {saving ? 'Saving...' : 'Save Procedure'}
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
  permanentProceduresContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  permanentProcedureText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: '#333',
  },
  introText: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 12,
    color: '#2c3e50',
  },
  bulletText: {
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
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
    minHeight: 120,
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

export default InventoryProceduresForm;
