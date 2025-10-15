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
import { doc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';

const InventoryProceduresForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [additionalProcedures, setAdditionalProcedures] = useState('');
  const [showDepartments, setShowDepartments] = useState(false);
  const [departments, setDepartments] = useState({
    // Only Cigarettes and Liquor have sub-items for now per spec
    Cigarettes: {
      Cigarettes: { checked: false, number: '' },
      'Other Tobacco (OTP)': { checked: false, number: '' },
    },
    Liquor: {
      Beer: { checked: false, number: '' },
      Wine: { checked: false, number: '' },
      Liquor: { checked: false, number: '' },
    },
    // Category headers without sub-items included for display only
    Grocery: {},
    Perishable: {},
    'Frozen Foods': {},
    Dairy: {},
    'General Merchandise': {},
    'Health & Beauty': {},
  });

  // Custom department inputs
  const [customCategory, setCustomCategory] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customNumber, setCustomNumber] = useState('');

  const handleAddCustomDepartment = () => {
    const category = (customCategory || '').trim();
    const label = (customLabel || '').trim();
    const number = (customNumber || '').trim();
    if (!category || !label || !number) {
      Alert.alert('Missing info', 'Please enter Category, Department and Number.');
      return;
    }
    setDepartments((prev) => {
      const next = { ...prev };
      if (!next[category]) next[category] = {};
      next[category] = {
        ...next[category],
        [label]: { checked: true, number }
      };
      return next;
    });
    setCustomCategory('');
    setCustomLabel('');
    setCustomNumber('');
  };

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
      
      // Build Departments string if any selection present
      const buildDepartmentsString = () => {
        const lines = [];
        // Include only categories with at least one checked item
        const categories = Object.keys(departments);
        for (const category of categories) {
          const items = departments[category];
          if (!items || Object.keys(items).length === 0) continue;
          const anyChecked = Object.keys(items).some(k => items[k].checked);
          if (!anyChecked) continue;
          lines.push(`${category.toUpperCase()}`);
          for (const key of Object.keys(items)) {
            const { checked, number } = items[key];
            if (!checked) continue;
            lines.push(`_ ${key} ${number ?? ''}`.trim());
          }
          lines.push('');
        }
        return lines.join('\n').trim();
      };
      const departmentsString = showDepartments ? buildDepartmentsString() : (clientData.Departments || '');

      // Update the client with inventory procedures
      await updateDoc(clientRef, {
        Inv_Proc: combinedProcedures,
        Departments: departmentsString,
        updatedAt: new Date(),
      });

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

          <View style={{ marginTop: 10 }}>
            <TouchableOpacity 
              style={[styles.toggleButton, showDepartments ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setShowDepartments(!showDepartments)}
            >
              <Text style={styles.toggleButtonText}>{showDepartments ? 'Hide Departments' : 'Add Departments'}</Text>
            </TouchableOpacity>
          </View>

          {showDepartments && (
            <View style={styles.departmentsContainer}>
              {/* Category headers without inputs */}
              {['Grocery','Perishable','Frozen Foods','Dairy','General Merchandise','Health & Beauty'].map((cat) => (
                <View key={cat} style={styles.departmentCategoryBlock}>
                  <Text style={styles.departmentHeader}>{cat.toUpperCase()}</Text>
                </View>
              ))}

              {/* Cigarettes */}
              <View style={styles.departmentCategoryBlock}>
                <Text style={styles.departmentHeader}>CIGARETTES</Text>
                {Object.keys(departments.Cigarettes).map((item) => {
                  const { checked, number } = departments.Cigarettes[item];
                  return (
                    <View key={item} style={styles.departmentItemRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                        onPress={() => setDepartments({
                          ...departments,
                          Cigarettes: {
                            ...departments.Cigarettes,
                            [item]: { checked: !checked, number }
                          }
                        })}
                      />
                      <Text style={styles.departmentItemLabel}>{item}</Text>
                      <TextInput
                        style={styles.departmentNumberInput}
                        placeholder="Dept #"
                        keyboardType="default"
                        value={number}
                        onChangeText={(text) => setDepartments({
                          ...departments,
                          Cigarettes: {
                            ...departments.Cigarettes,
                            [item]: { checked, number: text }
                          }
                        })}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Liquor */}
              <View style={styles.departmentCategoryBlock}>
                <Text style={styles.departmentHeader}>LIQUOR</Text>
                {Object.keys(departments.Liquor).map((item) => {
                  const { checked, number } = departments.Liquor[item];
                  return (
                    <View key={item} style={styles.departmentItemRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                        onPress={() => setDepartments({
                          ...departments,
                          Liquor: {
                            ...departments.Liquor,
                            [item]: { checked: !checked, number }
                          }
                        })}
                      />
                      <Text style={styles.departmentItemLabel}>{item}</Text>
                      <TextInput
                        style={styles.departmentNumberInput}
                        placeholder="Dept #"
                        keyboardType="default"
                        value={number}
                        onChangeText={(text) => setDepartments({
                          ...departments,
                          Liquor: {
                            ...departments.Liquor,
                            [item]: { checked, number: text }
                          }
                        })}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Custom department entry */}
              <View style={styles.departmentCategoryBlock}>
                <Text style={styles.departmentHeader}>ADD OTHER DEPARTMENT</Text>
                <View style={styles.customRow}>
                  <TextInput
                    style={[styles.departmentNumberInput, { flex: 1 }]}
                    placeholder="Category (e.g., Cigarettes)"
                    value={customCategory}
                    onChangeText={setCustomCategory}
                  />
                </View>
                <View style={styles.customRow}>
                  <TextInput
                    style={[styles.departmentNumberInput, { flex: 1 }]}
                    placeholder="Department (e.g., Beer)"
                    value={customLabel}
                    onChangeText={setCustomLabel}
                  />
                  <TextInput
                    style={[styles.departmentNumberInput, { width: 120, marginLeft: 8 }]}
                    placeholder="Number"
                    keyboardType="number-pad"
                    value={customNumber}
                    onChangeText={setCustomNumber}
                  />
                </View>
                <TouchableOpacity style={[styles.toggleButton, styles.toggleOn]} onPress={handleAddCustomDepartment}>
                  <Text style={styles.toggleButtonText}>Add Department</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.label}>Additional Procedures (Optional)</Text>
          <Text style={styles.helperText}>Enter any additional procedures specific to this client. Each procedure on a new line - bullet points will be added automatically.</Text>
          
          <RichTextEditor
            value={additionalProcedures}
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
  toggleButton: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#007AFF',
  },
  toggleOff: {
    backgroundColor: '#6c757d',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  departmentsContainer: {
    marginTop: 16,
    backgroundColor: '#f9fbff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
    borderRadius: 8,
    padding: 12,
  },
  departmentCategoryBlock: {
    marginBottom: 12,
  },
  departmentHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  departmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  departmentItemLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  departmentNumberInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
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
