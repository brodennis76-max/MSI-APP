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

const ProgressiveReportsForm = ({ clientData, onBack, onComplete }) => {
  const [saving, setSaving] = useState(false);
  
  // Standard posting sheets information for all store types
  const standardPostingSheetsInfo = `Posting sheets are to be printed progressively for every location. Be sure to continually communicate with the store manager to get their feedback on any issues they may have or any recounts they may want. This will help eliminate a lengthy wrap.

The Crew Manager should start checking and verifying the counts as soon as they are complete. Provide the posting sheets progressively for the manager to walk as inventory progresses.

All posting sheets must be reviewed by the inventory manager before they can be posted. Any large discrepancies in the comparison of the current vs. prior should be investigated/recounted PRIOR to giving the posting sheets to the manager.`;

  // Parse existing data to separate posting sheets and utility reports
  const parseExistingData = (data) => {
    if (!data) return { postingSheets: standardPostingSheetsInfo, utilityReports: '' };
    
    const lines = data.split('\n');
    let postingSheets = [];
    let utilityReports = [];
    let currentSection = 'posting';
    
    for (const line of lines) {
      if (line.toLowerCase().includes('utility reports')) {
        currentSection = 'utility';
        continue;
      }
      // Skip "POSTING SHEETS" header line
      if (line.toLowerCase().trim() === 'posting sheets') {
        continue;
      }
      if (currentSection === 'posting') {
        postingSheets.push(line);
      } else {
        utilityReports.push(line);
      }
    }
    
    return {
      postingSheets: postingSheets.join('\n').trim() || standardPostingSheetsInfo,
      utilityReports: utilityReports.join('\n').trim()
    };
  };

  const existingData = parseExistingData(clientData.Prog_Rep);
  const [postingSheetsText, setPostingSheetsText] = useState(existingData.postingSheets);
  const [utilityReportsText, setUtilityReportsText] = useState(existingData.utilityReports);

  // Refs for keyboard navigation
  const postingSheetsRef = React.useRef(null);
  const utilityReportsRef = React.useRef(null);

  const handlePostingSheetsChange = (value) => {
    setPostingSheetsText(value);
  };

  const handleUtilityReportsChange = (value) => {
    setUtilityReportsText(value);
  };

  const handlePostingSheetsBlur = () => {
    const formattedValue = formatAsBulletPoints(postingSheetsText);
    setPostingSheetsText(formattedValue);
  };

  const handleUtilityReportsBlur = () => {
    const formattedValue = formatAsBulletPoints(utilityReportsText);
    setUtilityReportsText(formattedValue);
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
      
      // Combine posting sheets and utility reports
      const combinedText = `${postingSheetsText}\n\nUTILITY REPORTS\n${utilityReportsText}`;
      
      // Update the client with progressive reports (user can modify the text in the editor)
      await updateDoc(clientRef, {
        Prog_Rep: combinedText,
        updatedAt: new Date(),
      });

      // Use platform-specific alerts
      if (Platform.OS === 'web') {
        // For web, use native browser alert and call onComplete directly
        window.alert(`Success! Progressive reports saved for ${clientData.name}`);
        console.log('ProgressiveReportsForm: About to call onComplete()');
        console.log('ProgressiveReportsForm: onComplete function:', onComplete);
        if (onComplete) {
          onComplete();
          console.log('ProgressiveReportsForm: onComplete() called successfully');
        } else {
          console.error('ProgressiveReportsForm: onComplete is null/undefined!');
        }
      } else {
        // For mobile, use React Native Alert
        Alert.alert(
          'Success!', 
          `Progressive reports saved for ${clientData.name}`,
          [
            { text: 'OK', onPress: () => {
              console.log('ProgressiveReportsForm: Mobile alert OK pressed, calling onComplete');
              if (onComplete) {
                onComplete();
              }
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error saving progressive reports:', error);
      Alert.alert('Error', 'Failed to save progressive reports. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Progressive Reports</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
      >
        <Text style={styles.sectionTitle}>Progressive Reports for {clientData.name}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Posting Sheets</Text>
          <Text style={styles.helperText}>Standard posting sheets information is pre-populated below. You can modify, add to, or customize this content as needed. Each item on a new line - bullet points will be added automatically.</Text>
          
          <TextInput
            ref={postingSheetsRef}
            style={styles.textArea}
            value={postingSheetsText}
            onChangeText={handlePostingSheetsChange}
            onBlur={handlePostingSheetsBlur}
            placeholder="Enter posting sheets details on a new line"
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="next"
            onSubmitEditing={() => utilityReportsRef.current?.focus()}
          />

          <Text style={styles.label}>Utility Reports</Text>
          <Text style={styles.helperText}>Enter utility reports information. Each item on a new line - bullet points will be added automatically.</Text>
          
          <TextInput
            ref={utilityReportsRef}
            style={styles.textArea}
            value={utilityReportsText}
            onChangeText={handleUtilityReportsChange}
            onBlur={handleUtilityReportsBlur}
            placeholder="Enter utility reports details on a new line"
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
    backgroundColor: '#007AFF',
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

export default ProgressiveReportsForm;









