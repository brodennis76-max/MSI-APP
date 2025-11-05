import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { generateAccountInstructionsPDF } from './UniversalPDFGenerator';

const EditCompletionScreen = ({ clientData, onFinalize, onBackToDashboard }) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await generateAccountInstructionsPDF({ clientId: clientData.id });
    } catch (e) {
      const msg = e?.message || 'Failed to generate PDF';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Complete</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Edits Complete for {clientData.name}</Text>
          <Text style={styles.subtitle}>Choose an action below to finalize or generate a PDF.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity 
          style={[styles.primary, generating && styles.disabled]}
          onPress={handleGeneratePDF}
          disabled={generating}
        >
          {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate PDF</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.success}
          onPress={onFinalize}
        >
          <Text style={styles.buttonText}>Finalize</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.back}
          onPress={onBackToDashboard}
        >
          <Text style={styles.buttonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerLogo: { width: 40, height: 40, resizeMode: 'contain' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10, flex: 1 },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555' },
  bottom: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 12 },
  primary: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center' },
  success: { backgroundColor: '#28a745', padding: 16, borderRadius: 10, alignItems: 'center' },
  back: { backgroundColor: '#6c757d', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabled: { backgroundColor: '#ccc' },
});

export default EditCompletionScreen;






