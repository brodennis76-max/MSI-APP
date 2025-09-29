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

const PreInventoryForm = ({ clientData, onBack, onComplete }) => {
  console.log('PreInventoryForm: Received clientData:', clientData);
  const [saving, setSaving] = useState(false);
  // Get ALR information from clientData
  const alrValue = clientData.ALR || 'NOT DETERMINED';
  
  // Store type options
  const storeTypes = ['Grocery', 'Convenience', 'Clothing', 'Hardware', 'Other'];

  // Get instructions based on account type
  const getInstructionsByAccountType = (accountType) => {
    const baseInstructions = `• Account disk is available via the MSI website and Global Resource.
• ALR disk is ${alrValue}.
• Priors are REQUIRED for all store counts.
• Review inventory checklist before leaving the office. A copy of the inventory checklist is attached to the end of these account instructions.`;

    // Store-type-specific area mappings
    const getAreaMappingByStoreType = (storeType) => {
      switch (storeType) {
        case 'Grocery':
          return `STANDARD STORE MAPPING APPLIES. Map as Follows:
DO NOT ADD ADDITIONAL AREA NUMBERS
1. 1#21, 1#61 gondolas. The last two digits of each number identify left or right side of gondola (from front of store). For example 1021 would be first right side of the gondola going right to left in the store. The left side of the gondola would be 1061. The next gondola right side would be 1121, then 1161 right side.
2. Front end caps are 3801 (sub location 01, 02 etc. for each end cap)
3. Back end caps are 3901 (sub location 01, 02 etc. for each end cap)
4. Front wall 4001.
5. Left wall 4101.
6. Rear wall 4201.
7. Right wall 4301.
8. Check stand and lobby area 5000 series.
9. Displays 6001, 6101, 6201, etc. ***Counters to number each display with a yellow tag to match posting sheet locations.
10. Office 7001
11. Backroom use 9000 series

NOTE: Stores are to be counted in 4' sections or by cooler doors.
* All locations must have a description. Utilize the location description utility as needed.`;

        case 'Convenience':
          return `STANDARD STORE MAPPING APPLIES. Map as Follows:
DO NOT ADD ADDITIONAL AREA NUMBERS
1. 1#21, 1#61 gondolas. The last two digits of each number identify left or right side of gondola (FEC). For example 1021 would be first gondola closest to the door (front end and right side). The BEC, left side of the gondola would be 1061 (back end & right side). The next gondola right side would be 1121, then 1161 right side.
2. Front wall 4001.
3. Left wall 4101.
4. Rear wall 4201.
5. Right wall 4301.
6. Check stand 5001.
7. Check stand Wall 5002.
8. Check stand Under 5003.
9. Lottery Tickets 5099.

NOTE: Stores are to be counted in 4' sections or by cooler doors.
* All locations must have a description. Utilize the location description utility as needed.`;

        case 'Clothing':
          return `Area numbers will be as follows:
DO NOT ADD ADDITIONAL AREA NUMBERS.
1. Men's Section 1001
2. Women's Section 2001
3. Children's Section 3001
4. Accessories 4001
5. Shoes 5001
6. Fitting Rooms 6001
7. Backroom 7001
8. Jewelry Counter 8001
9. Handbags 9001
10. Seasonal Items 10001
11. Clearance Rack 11001
12. Stock Room 12001

All areas are counted in 4 foot locations.

ALL LOCATIONS MUST HAVE A DESCRIPTION. BE EXTRA DESCRIPTIVE IN THE CHECKOUT AREA. This will allow the team that comes behind you to count in the correct locations.`;

        case 'Hardware':
          return `Area numbers will be as follows:
DO NOT ADD ADDITIONAL AREA NUMBERS.
1. Tools Section 1001
2. Electrical 2001
3. Plumbing 3001
4. Paint 4001
5. Garden Center 5001
6. Lumber 6001
7. Backroom 7001
8. Fasteners 8001
9. Safety Equipment 9001
10. Automotive 10001
11. Outdoor Equipment 11001
12. Workbench Area 12001

All areas are counted in 4 foot locations.

ALL LOCATIONS MUST HAVE A DESCRIPTION. BE EXTRA DESCRIPTIVE IN THE CHECKOUT AREA. This will allow the team that comes behind you to count in the correct locations.`;

        case 'Other':
          return `Area numbers will be as follows:
DO NOT ADD ADDITIONAL AREA NUMBERS.
1. Main Floor 1001
2. Display Areas 2001
3. Storage 3001
4. Counter Space 4001
5. Backroom 5001
6. Office Area 6001
7. Receiving 7001
8. Customer Service 8001
9. Returns 9001
10. Special Items 10001
11. Seasonal 11001
12. Miscellaneous 12001

All areas are counted in 4 foot locations.

ALL LOCATIONS MUST HAVE A DESCRIPTION. BE EXTRA DESCRIPTIVE IN THE CHECKOUT AREA. This will allow the team that comes behind you to count in the correct locations.`;

        default:
          return `Area numbers will be as follows:
DO NOT ADD ADDITIONAL AREA NUMBERS.
1. Main Area 1001
2. Secondary Area 2001
3. Storage 3001
4. Backroom 4001

All areas are counted in 4 foot locations.

ALL LOCATIONS MUST HAVE A DESCRIPTION. BE EXTRA DESCRIPTIVE IN THE CHECKOUT AREA. This will allow the team that comes behind you to count in the correct locations.`;
      }
    };

    switch (accountType) {
      case 'Grocery':
        return {
          generalInstructions: baseInstructions + `

• Focus on perishable items and cold storage areas
• Pay special attention to expiration dates and product rotation
• Ensure all produce areas are properly organized before counting`,
          areaMapping: getAreaMappingByStoreType('Grocery'),
          storePrepInstructions: `1. Clear all aisles and ensure products are properly faced
2. Remove any damaged or expired products
3. Organize cold storage areas by category
4. Ensure all pricing is current and visible
5. Prepare deli and bakery areas for counting
6. Check that all scales and equipment are working properly`
        };
      
      case 'Convenience':
        return {
          generalInstructions: baseInstructions + `

• Focus on high-turnover items and impulse purchases
• Pay special attention to tobacco and alcohol sections
• Ensure all security measures are in place`,
          areaMapping: getAreaMappingByStoreType('Convenience'),
          storePrepInstructions: `1. Clear all aisles and ensure products are properly faced
2. Remove any damaged or expired products
3. Organize tobacco and alcohol sections
4. Ensure all pricing is current and visible
5. Prepare hot food areas for counting
6. Check that all lottery and payment systems are working`
        };
      
      case 'Clothing':
        return {
          generalInstructions: baseInstructions + `

• Focus on size organization and seasonal items
• Pay special attention to fitting room areas
• Ensure all security tags are properly attached`,
          areaMapping: getAreaMappingByStoreType('Clothing'),
          storePrepInstructions: `1. Organize clothing by size and category
2. Remove any damaged or soiled items
3. Ensure all security tags are properly attached
4. Organize fitting room areas
5. Check that all displays are properly arranged
6. Prepare stock room for counting`
        };
      
      case 'Hardware':
        return {
          generalInstructions: baseInstructions + `

• Focus on tool organization and safety equipment
• Pay special attention to hazardous materials
• Ensure all safety protocols are followed`,
          areaMapping: getAreaMappingByStoreType('Hardware'),
          storePrepInstructions: `1. Organize tools by category and size
2. Remove any damaged or unsafe items
3. Ensure all hazardous materials are properly stored
4. Organize electrical and plumbing sections
5. Check that all displays are properly arranged
6. Prepare garden center for counting`
        };
      
      case 'Other':
        return {
          generalInstructions: baseInstructions + `

• Focus on general merchandise organization
• Pay special attention to seasonal items
• Ensure all areas are properly organized`,
          areaMapping: getAreaMappingByStoreType('Other'),
          storePrepInstructions: `1. Clear all aisles and ensure products are properly faced
2. Remove any damaged or expired products
3. Ensure all pricing is current and visible
4. Organize all sections by category
5. Check that all equipment is working properly
6. Prepare all areas for counting`
        };
      
      default:
        return {
          generalInstructions: baseInstructions,
          areaMapping: getAreaMappingByStoreType('Convenience'),
          storePrepInstructions: `1. Clear all aisles and ensure products are properly faced
2. Remove any damaged or expired products
3. Ensure all pricing is current and visible
4. Organize all sections by category
5. Check that all equipment is working properly
6. Prepare all areas for counting`
        };
    }
  };
  
  // Get account type-specific instructions
  const accountTypeInstructions = getInstructionsByAccountType(clientData.accountType || 'Convenience');
  
  const [formData, setFormData] = useState({
    storeType: clientData.accountType || 'Convenience',
    generalInstructions: clientData.preInventory || accountTypeInstructions.generalInstructions,
    areaMapping: clientData.sections?.[0]?.subsections?.[0]?.content || accountTypeInstructions.areaMapping,
    storePrepInstructions: clientData.sections?.[0]?.subsections?.[1]?.content || accountTypeInstructions.storePrepInstructions
  });

  // Refs for keyboard navigation
  const generalInstructionsRef = React.useRef(null);
  const areaMappingRef = React.useRef(null);
  const storePrepInstructionsRef = React.useRef(null);

  const handleInputChange = (field, value) => {
    // Store raw input without formatting for better typing experience
    setFormData({ ...formData, [field]: value });
  };

  const handleStoreTypeChange = (storeType) => {
    // Get new instructions based on the selected store type
    const newInstructions = getInstructionsByAccountType(storeType);
    
    setFormData({
      ...formData,
      storeType: storeType,
      generalInstructions: newInstructions.generalInstructions,
      areaMapping: newInstructions.areaMapping,
      storePrepInstructions: newInstructions.storePrepInstructions
    });
  };

  const handleInputBlur = (field) => {
    // Apply formatting when user finishes typing (on blur)
    if (field === 'generalInstructions') {
      const formattedValue = formatAsBulletPoints(formData.generalInstructions);
      setFormData({ ...formData, [field]: formattedValue });
    } else if (field === 'storePrepInstructions') {
      const formattedValue = formatAsNumberedList(formData.storePrepInstructions);
      setFormData({ ...formData, [field]: formattedValue });
    }
  };


  const formatAsBulletPoints = (text) => {
    if (!text.trim()) return text;
    
    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Format each line with a bullet point
    const bulletLines = lines.map((line) => {
      // Remove existing bullet points if they exist
      const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
      return `• ${cleanLine}`;
    });
    
    return bulletLines.join('\n');
  };

  const formatAsNumberedList = (text) => {
    if (!text.trim()) return text;
    
    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Format each line with a number
    const numberedLines = lines.map((line, index) => {
      // Remove existing numbers if they exist
      const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
      return `${index + 1}. ${cleanLine}`;
    });
    
    return numberedLines.join('\n');
  };

  const handleSave = async () => {
    if (!formData.generalInstructions.trim()) {
      Alert.alert('Error', 'Please fill in the General Instructions field.');
      return;
    }

    setSaving(true);

    try {
      const clientRef = doc(db, 'clients', clientData.id);
      
      // Build update object with only changed fields
      const updateData = {
        updatedAt: new Date(),
      };

      // Check if store type changed
      if (formData.storeType !== clientData.accountType) {
        updateData.accountType = formData.storeType;
      }

      // Check if general instructions changed
      const originalGeneralInstructions = clientData.preInventory || '';
      if (formData.generalInstructions !== originalGeneralInstructions) {
        updateData.preInventory = formData.generalInstructions;
      }

      // Check if area mapping changed
      const originalAreaMapping = clientData.sections?.[0]?.subsections?.[0]?.content || '';
      if (formData.areaMapping !== originalAreaMapping) {
        updateData.sections = [
          {
            sectionName: "Pre-Inventory",
            content: formData.generalInstructions,
            subsections: [
              {
                sectionName: "Area Mapping",
                content: formData.areaMapping || "No area mapping instructions provided."
              },
              {
                sectionName: "Store Prep Instructions",
                content: formData.storePrepInstructions || "No store prep instructions provided."
              }
            ]
          }
        ];
      }

      // Check if store prep instructions changed
      const originalStorePrep = clientData.sections?.[0]?.subsections?.[1]?.content || '';
      if (formData.storePrepInstructions !== originalStorePrep) {
        if (!updateData.sections) {
          updateData.sections = [
            {
              sectionName: "Pre-Inventory",
              content: formData.generalInstructions,
              subsections: [
                {
                  sectionName: "Area Mapping",
                  content: formData.areaMapping || "No area mapping instructions provided."
                },
                {
                  sectionName: "Store Prep Instructions",
                  content: formData.storePrepInstructions || "No store prep instructions provided."
                }
              ]
            }
          ];
        }
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 1) { // More than just updatedAt
        await updateDoc(clientRef, updateData);
        console.log('Updated fields:', Object.keys(updateData));
      } else {
        console.log('No changes detected, skipping database update');
      }

      Alert.alert(
        'Success!', 
        `Pre-inventory instructions saved for ${clientData.name}`,
        [
          { text: 'OK', onPress: () => onComplete() }
        ]
      );
    } catch (error) {
      console.error('Error saving pre-inventory instructions:', error);
      Alert.alert('Error', 'Failed to save pre-inventory instructions. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Pre-Inventory Instructions</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Complete Pre-Inventory Instructions for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Store Type *</Text>
          <Text style={styles.helperText}>Select the type of store to generate appropriate instructions</Text>
          <View style={styles.radioContainer}>
            {storeTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.radioOption}
                onPress={() => handleStoreTypeChange(type)}
              >
                <View style={styles.radioCircle}>
                  {formData.storeType === type && <View style={styles.radioSelected} />}
                </View>
                <Text style={styles.radioLabel}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>General Instructions *</Text>
          <Text style={styles.helperText}>Enter each instruction on a new line - they will be automatically formatted as bullet points when you finish typing</Text>
          <TextInput
            ref={generalInstructionsRef}
            style={styles.textArea}
            value={formData.generalInstructions}
            onChangeText={(text) => handleInputChange('generalInstructions', text)}
            onBlur={() => handleInputBlur('generalInstructions')}
            placeholder="Enter each instruction on a new line"
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="next"
            onSubmitEditing={() => areaMappingRef.current?.focus()}
          />

          <Text style={styles.label}>Area Mapping</Text>
          <Text style={styles.helperText}>Enter each area on a new line</Text>
          <TextInput
            ref={areaMappingRef}
            style={styles.textArea}
            value={formData.areaMapping}
            onChangeText={(text) => handleInputChange('areaMapping', text)}
            onBlur={() => handleInputBlur('areaMapping')}
            placeholder="Enter each instruction on a new line"
            multiline
            numberOfLines={4}
            autoCapitalize="sentences"
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="next"
            onSubmitEditing={() => storePrepInstructionsRef.current?.focus()}
          />

          <Text style={styles.label}>Store Prep Instructions</Text>
          <Text style={styles.helperText}>Enter each instruction on a new line - they will be automatically formatted as a numbered list (1., 2., 3.) when you finish typing</Text>
          <TextInput
            ref={storePrepInstructionsRef}
            style={styles.textArea}
            value={formData.storePrepInstructions}
            onChangeText={(text) => handleInputChange('storePrepInstructions', text)}
            onBlur={() => handleInputBlur('storePrepInstructions')}
            placeholder="Enter each instruction on a new line"
            multiline
            numberOfLines={4}
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
            {saving ? 'Saving...' : 'Save Instructions'}
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
    marginBottom: 8,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
  radioContainer: {
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
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
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});

export default PreInventoryForm;

