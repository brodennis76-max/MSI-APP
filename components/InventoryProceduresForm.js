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
import { doc, updateDoc, deleteField, getDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
const InventoryProceduresForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [additionalProcedures, setAdditionalProcedures] = useState('');
  const [hasDepartments, setHasDepartments] = useState(false);
  const [departments, setDepartments] = useState('');

  // Ref for keyboard navigation
  const additionalProceduresRef = React.useRef(null);
  const departmentsRef = React.useRef(null);

  const permanentProcedures = [
    "The inventory manager's first task when entering the store is to have a pre-inventory meeting with the store manager. During this meeting they will perform the following function:",
    "• Identify who will be involved with inventory from the store (who will be walking posting sheets, who can answer questions, etc.)",
    "• Communicate the inventory flow.",
    "• Walk the store and discuss any areas that need to be addressed (prep/pricing), cooler and stockroom organization, and any hidden product.",
    "• IF THE STORE IS NOT COUNTABLE CONTACT MSI CORPORATE IMMEDIATELY TO CANCEL THE INVENTORY."
  ];

  // Load latest saved values on mount
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const clientRef = doc(db, 'clients', clientData.id);
        const snap = await getDoc(clientRef);
        if (!snap.exists()) return;
        const data = snap.data() || {};

        // Restore departments toggle and value
        if (isMounted) {
          setHasDepartments(!!data.Has_Departments);
          setDepartments(typeof data.Departments === 'string' ? data.Departments : '');
        }

        // Attempt to extract additional procedures from combined Inv_Proc
        if (typeof data.Inv_Proc === 'string' && data.Inv_Proc.trim()) {
          const permanentBlock = permanentProcedures.join('\n\n');
          if (data.Inv_Proc.startsWith(permanentBlock)) {
            const rest = data.Inv_Proc.slice(permanentBlock.length).trim();
            // Remove leading double newlines if present
            const cleaned = rest.replace(/^\n+/, '').trim();
            if (isMounted) setAdditionalProcedures(cleaned);
          }
        }
      } catch (e) {
        // Non-fatal: keep defaults if fetch fails
        console.warn('InventoryProceduresForm: failed to load existing values', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [clientData?.id]);

  const handleInputChange = (value) => {
    // Store raw input without formatting for better typing experience
    setAdditionalProcedures(value);
  };

  const handleInputBlur = () => {
    // Apply bullet point formatting when user finishes typing (on blur)
    const formattedValue = formatAsBulletPoints(additionalProcedures);
    setAdditionalProcedures(formattedValue);
  };

  const handleDepartmentsChange = (value) => {
    setDepartments(value);
  };

  const handleDepartmentsBlur = () => {
    const formattedValue = formatAsBulletPoints(departments);
    setDepartments(formattedValue);
  };

  const toggleHasDepartments = (value) => {
    setHasDepartments(value);
    if (!value) {
      // If turned off, clear local departments text
      setDepartments('');
    }
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
      
      // Update the client with inventory procedures and departments (if provided)
      const updatePayload = {
        Inv_Proc: combinedProcedures,
        updatedAt: new Date(),
      };

      // Persist a flag for clarity
      updatePayload.Has_Departments = !!hasDepartments;

      if (hasDepartments && departments && departments.trim()) {
        updatePayload.Departments = departments.trim();
      } else {
        // Remove Departments field if previously set and now not applicable
        updatePayload.Departments = deleteField();
      }

      await updateDoc(clientRef, updatePayload);

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        // For web, use native browser alert and call onComplete directly
        window.alert(`Success! Inventory procedures saved for ${clientData.name}`);
        console.log('InventoryProceduresForm: About to call onComplete()');
        onComplete();
        console.log('InventoryProceduresForm: onComplete() called');
      } else {
        // For mobile, use React Native Alert
        Alert.alert(
          'Success!', 
          `Inventory procedures saved for ${clientData.name}`,
          [
            { text: 'OK', onPress: () => onComplete() }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving inventory procedures:', error);
      Alert.alert('Error', 'Failed to save inventory procedures. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Navigation is handled by parent component

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
          
          <RichTextEditor
            value={additionalProcedures}
            onChange={setAdditionalProcedures}
          />

          <Text style={styles.label}>Does this account have departments?</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{hasDepartments ? 'Yes' : 'No'}</Text>
            <Switch
              value={hasDepartments}
              onValueChange={toggleHasDepartments}
            />
          </View>

          {hasDepartments && (
            <>
              <Text style={styles.label}>Departments</Text>
              <Text style={styles.helperText}>List departments relevant to inventory. One per line; bullets added automatically.</Text>
              <TextInput
                ref={departmentsRef}
                style={styles.textArea}
                value={departments}
                onChangeText={handleDepartmentsChange}
                onBlur={handleDepartmentsBlur}
                placeholder={"e.g. Grocery\nDairy\nFrozen\nHealth & Beauty"}
                multiline
                numberOfLines={6}
                autoCapitalize="sentences"
                autoCorrect={true}
                spellCheck={true}
                returnKeyType="done"
              />
            </>
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
