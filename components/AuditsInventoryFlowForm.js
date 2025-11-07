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
  Platform,
  Switch
} from 'react-native';
import { db } from '../firebase-config';
import { doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import PreInventoryTeamInstructionsForm from './PreInventoryTeamInstructionsForm';
import { sanitizeHtmlForFirebase } from '../utils/sanitizeHtmlForFirebase';

const AuditsInventoryFlowForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [auditsText, setAuditsText] = useState(clientData.Audits || `Posting sheets will be provided progressively to the store managers as areas are completed.

Audit trails will be provided as requested based on posting sheet results, within reason, during the count.`);
  const [inventoryFlowText, setInventoryFlowText] = useState(clientData.Inv_Flow || '');
  const [showTeamInstructions, setShowTeamInstructions] = useState(false);
  const [hasSpecialNotes, setHasSpecialNotes] = useState(false);
  const [specialNotes, setSpecialNotes] = useState(clientData.Special_Notes || '');

  // Refs for keyboard navigation
  const auditsRef = React.useRef(null);
  const inventoryFlowRef = React.useRef(null);

  const handleAuditsChange = (value) => {
    // Store raw input without formatting for better typing experience
    setAuditsText(value);
  };

  const handleInventoryFlowChange = (value) => {
    // Store raw input without formatting for better typing experience
    setInventoryFlowText(value);
  };

  const handleSpecialNotesChange = (value) => {
    setSpecialNotes(value);
  };

  const handleAuditsBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(auditsText);
    setAuditsText(formattedValue);
  };

  const handleInventoryFlowBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(inventoryFlowText);
    setInventoryFlowText(formattedValue);
  };

  const handleSpecialNotesBlur = () => {
    const formattedValue = formatAsBulletPoints(specialNotes);
    setSpecialNotes(formattedValue);
  };

  // Load latest saved values on mount to repopulate when navigating back
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ref = doc(db, 'clients', clientData.id);
        const snap = await getDoc(ref);
        if (!active || !snap.exists()) return;
        const data = snap.data() || {};
        if (typeof data.Audits === 'string') setAuditsText(data.Audits);
        if (typeof data.Inv_Flow === 'string') setInventoryFlowText(data.Inv_Flow);
        if (typeof data.Special_Notes === 'string') setSpecialNotes(data.Special_Notes);
        setHasSpecialNotes(!!data.Has_Special_Notes);
      } catch (e) {
        console.warn('AuditsInventoryFlowForm: failed to load existing values', e);
      }
    })();
    return () => { active = false; };
  }, [clientData?.id]);

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
    if (!auditsText.trim() && !inventoryFlowText.trim() && !(hasSpecialNotes && specialNotes.trim())) {
      Alert.alert('Error', 'Please enter at least one field (Audits, Inventory Flow, or Special Notes).');
      return;
    }

    setSaving(true);

    try {
      const clientRef = doc(db, 'clients', clientData.id);
      
      // Add compliance statement to inventory flow if there's content and it's not already present
      const complianceStatement = "Be flexible! If the store would like a different flow be compliant.";
      const hasComplianceStatement = inventoryFlowText.includes(complianceStatement);
      const finalInventoryFlow = inventoryFlowText.trim() && !hasComplianceStatement
        ? `${inventoryFlowText}\n${complianceStatement}`
        : inventoryFlowText;
      
      // Sanitize HTML before saving to Firebase - remove all inline styles and unnecessary attributes
      const sanitizedAudits = sanitizeHtmlForFirebase(auditsText);
      const sanitizedInventoryFlow = sanitizeHtmlForFirebase(finalInventoryFlow);
      const sanitizedSpecialNotes = hasSpecialNotes && specialNotes.trim() 
        ? sanitizeHtmlForFirebase(specialNotes) 
        : null;
      
      // Update the client with audits, inventory flow, and special notes
      const payload = {
        Audits: sanitizedAudits,
        Inv_Flow: sanitizedInventoryFlow,
        Has_Special_Notes: !!hasSpecialNotes,
        updatedAt: new Date(),
      };
      if (sanitizedSpecialNotes) {
        payload.Special_Notes = sanitizedSpecialNotes;
      } else {
        payload.Special_Notes = deleteField();
      }
      await updateDoc(clientRef, payload);

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        // For web, use native browser alert and call onComplete directly
        window.alert(`Success! Audits and Inventory Flow data saved for ${clientData.name}`);
        console.log('AuditsInventoryFlowForm: About to call onComplete()');
        onComplete();
        console.log('AuditsInventoryFlowForm: onComplete() called');
      } else {
        // For mobile, use React Native Alert
        Alert.alert(
          'Success!', 
          `Audits and Inventory Flow data saved for ${clientData.name}`,
          [
            { text: 'OK', onPress: () => onComplete() }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving audits and inventory flow data:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show Team Instructions form if needed
  if (showTeamInstructions) {
    return (
      <PreInventoryTeamInstructionsForm 
        clientData={clientData}
        onBack={() => setShowTeamInstructions(false)}
        onComplete={onComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Audits & Inventory Flow</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Complete Audits & Inventory Flow for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Audits *</Text>
          <Text style={styles.helperText}>Enter each audit item on a new line. Bullet points will be added automatically.</Text>
          
          <RichTextEditor
            value={auditsText}
            onChange={setAuditsText}
          />

          <Text style={styles.label}>Inventory Flow *</Text>
          <Text style={styles.helperText}>Enter each flow step on a new line. Bullet points will be added automatically. A compliance statement will be automatically added to the final output.</Text>
          
          <RichTextEditor
            value={inventoryFlowText}
            onChange={setInventoryFlowText}
          />

        <Text style={styles.label}>Special Notes</Text>
        <Text style={styles.helperText}>Enable if this account has special notes or additional items for the count.</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{hasSpecialNotes ? 'Yes' : 'No'}</Text>
          <Switch value={hasSpecialNotes} onValueChange={setHasSpecialNotes} />
        </View>
        {hasSpecialNotes && (
          <RichTextEditor
            value={specialNotes}
            onChange={setSpecialNotes}
          />
        )}
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
            {saving ? 'Saving...' : 'Save & Complete'}
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

export default AuditsInventoryFlowForm;
