import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert
} from 'react-native';
import { db } from '../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import NonCountProductsForm from './NonCountProductsForm';

const PreInventoryTeamInstructionsForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  const [showNonCountProducts, setShowNonCountProducts] = useState(false);

  const teamInstructions = [
    "The Inventory Manager will brief the team on the proper counting procedures and their responsibilities to the customer and their customers. Below are the guidelines that must always be followed:",
    "1. Shirts are to be tucked in, pants pulled up, no hats or facial piercings.",
    "2. NO FOOD OR DRINK ON THE SALESFLOOR.",
    "3. Cell phones are to be turned OFF, except for supervisors running the inventory.",
    "4. Talking will be kept to a minimum and is limited to the current inventory.",
    "5. iPod, or any other music device and earbuds are not allowed.",
    "6. Always be polite, courteous and respectful to the store, and the store's customers.",
    "7. If you cannot see it, you cannot count it….use a ladder where needed.",
    "8. During break times, do not loiter in front of the store. Smoking will be done away from the store, near the vans.",
    "9. All purchased items must have a receipt attached…do not consume items prior to purchase.",
    "10. Count from left to right, top to bottom.",
    "11. If the location is not properly prepared for inventory (mixed up product/pricing issues), do not fix it. Inform the inventory manager so we can provide the store personnel the opportunity to prep the section for a good count.",
    "12. Yellow Audit Tags: Do not pre tag your location. Tag as you count."
  ];

  const handleContinue = async () => {
    console.log('handleContinue called, clientData:', clientData);
    setSaving(true);

    try {
      const clientRef = doc(db, 'clients', clientData.id);
      console.log('Client ref created:', clientRef);
      
      // Save team instructions to Firebase
      await updateDoc(clientRef, {
        'Team-Instr': teamInstructions.join('\n'),
        updatedAt: new Date(),
      });
      console.log('Firebase update successful');

      Alert.alert(
        'Success!', 
        `Team instructions saved for ${clientData.name}`,
        [
          { text: 'OK', onPress: () => {
            console.log('OK pressed, setting showNonCountProducts to true');
            setShowNonCountProducts(true);
          }}
        ]
      );
    } catch (error) {
      console.error('Error saving team instructions:', error);
      Alert.alert('Error', 'Failed to save team instructions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show Non-Count Products form if needed
  console.log('showNonCountProducts state:', showNonCountProducts);
  if (showNonCountProducts) {
    console.log('Rendering NonCountProductsForm');
    return (
      <NonCountProductsForm 
        clientData={clientData}
        onBack={() => setShowNonCountProducts(false)}
        onComplete={onComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Pre-Inventory Team Instructions</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Team Instructions for {clientData.name}</Text>
        
        <View style={styles.instructionsContainer}>
          {teamInstructions.map((instruction, index) => (
            <Text key={index} style={[
              styles.instructionText,
              index === 0 ? styles.introText : styles.ruleText
            ]}>
              {instruction}
            </Text>
          ))}
        </View>

        <View style={styles.acknowledgmentContainer}>
          <Text style={styles.acknowledgmentText}>
            Please review these instructions with your team before beginning the inventory process.
          </Text>
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
          style={[styles.continueButton, saving && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          <Text style={styles.continueButtonText}>
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
  instructionsContainer: {
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
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    color: '#333',
  },
  introText: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 20,
    color: '#2c3e50',
  },
  ruleText: {
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
  },
  acknowledgmentContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  acknowledgmentText: {
    fontSize: 14,
    color: '#0c5460',
    textAlign: 'center',
    fontStyle: 'italic',
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
  continueButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PreInventoryTeamInstructionsForm;