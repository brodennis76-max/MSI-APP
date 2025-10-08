import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View, TouchableOpacity, useWindowDimensions, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AccInstPicker from './components/AccInstPicker';
import AddAccountFormTest from './components/AddAccountFormTest';
import EditAccountFlow from './components/EditAccountFlow';
// Removed PDF generator import
import { useEffect, useState } from 'react';

export default function App() {
  const [showLanding, setShowLanding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing' | 'accountInstructions' | 'addAccount' | 'editAccount'
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;

  // Removed test data for PDF generator

  // Show splash screen for 7 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLanding(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  // Splash screen
  if (!showLanding) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.splashContainer}>
              <Image source={require('./assets/login-logo.jpg')} style={styles.splashLogo} />
          <Text style={styles.tagline}>Best Service.</Text>
          <Text style={styles.tagline}>Competitive Prices.</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Account Instructions screen
  if (currentScreen === 'accountInstructions') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <AccInstPicker 
            onBack={() => setCurrentScreen('landing')}
            onMenuPress={() => setMenuOpen(!menuOpen)}
          />
          {menuOpen && (
            <View style={styles.menu}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('accountInstructions');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Account Instructions</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('addAccount');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Add Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('testPDF');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Test PDF Generator</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Add Account screen
  if (currentScreen === 'addAccount') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <AddAccountFormTest 
            onBack={() => setCurrentScreen('landing')}
            onMenuPress={() => setMenuOpen(!menuOpen)}
          />
          {menuOpen && (
            <View style={styles.menu}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('accountInstructions');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Account Instructions</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('addAccount');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Add Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setCurrentScreen('testPDF');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuText}>Test PDF Generator</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Edit Account screen
  if (currentScreen === 'editAccount') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <EditAccountFlow onBack={() => setCurrentScreen('landing')} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Test PDF Generator screen removed


  // Landing page (default)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.landingContainer}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Image source={require('./assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity 
            style={styles.hamburger} 
            onPress={() => setMenuOpen(!menuOpen)}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>
        {menuOpen && (
          <View style={styles.menu}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setCurrentScreen('accountInstructions');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.menuText}>Account Instructions</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setCurrentScreen('addAccount');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.menuText}>Add Account</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setCurrentScreen('editAccount');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.menuText}>Edit Account</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.contentText}>Welcome to MSI Dashboard</Text>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.modernButton, styles.primaryButton]}
              onPress={() => {
                setCurrentScreen('accountInstructions');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.buttonIcon}>📋</Text>
              <Text style={styles.buttonText}>Account Instructions</Text>
              <Text style={styles.buttonSubtext}>Generate PDFs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modernButton, styles.secondaryButton]}
              onPress={() => {
                setCurrentScreen('addAccount');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.buttonIcon}>➕</Text>
              <Text style={styles.buttonText}>Add Account</Text>
              <Text style={styles.buttonSubtext}>Create New Client</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modernButton, styles.tertiaryButton]}
              onPress={() => {
                setCurrentScreen('editAccount');
                setMenuOpen(false);
              }}
            >
              <Text style={styles.buttonIcon}>✏️</Text>
              <Text style={styles.buttonText}>Edit Account</Text>
              <Text style={styles.buttonSubtext}>Modify Existing</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 300,
    height: 150,
    resizeMode: 'contain',
  },
  tagline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  landingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  hamburger: {
    marginLeft: 'auto',
    padding: 10,
  },
  hamburgerText: {
    fontSize: 24,
    color: '#333',
  },
  menu: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 15,
    paddingTop: 20,
  },
  contentText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
    alignSelf: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 15,
  },
  modernButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    flex: 1,
    minWidth: 280,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryButton: {
    backgroundColor: '#4F46E5', // Indigo
    borderColor: '#4338CA',
  },
  secondaryButton: {
    backgroundColor: '#059669', // Emerald
    borderColor: '#047857',
  },
  tertiaryButton: {
    backgroundColor: '#DC2626', // Red
    borderColor: '#B91C1C',
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  buttonLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});