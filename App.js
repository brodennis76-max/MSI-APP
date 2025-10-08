import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
          
          <View style={styles.topButtonsContainer}>
            <TouchableOpacity 
              style={[styles.dashboardButton, { width: '31%' }]}
              onPress={() => {
                setCurrentScreen('accountInstructions');
                setMenuOpen(false);
              }}
            >
              <Image 
                source={require('./assets/MSI APP BUTTONS/ActIns-Button.png')} 
                style={styles.buttonImage}
                resizeMode="contain"
              />
              <Text style={styles.buttonLabel}>Account Instructions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dashboardButton, { width: '31%' }]}
              onPress={() => {
                setCurrentScreen('addAccount');
                setMenuOpen(false);
              }}
            >
              <Image 
                source={require('./assets/MSI APP BUTTONS/AddAct-Button.png')} 
                style={styles.buttonImage}
                resizeMode="contain"
              />
              <Text style={styles.buttonLabel}>Add Account</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dashboardButton, { width: '31%' }]}
              onPress={() => {
                setCurrentScreen('editAccount');
                setMenuOpen(false);
              }}
            >
              <Image 
                source={require('./assets/MSI APP BUTTONS/ActIns-Button.png')} 
                style={styles.buttonImage}
                resizeMode="contain"
              />
              <Text style={styles.buttonLabel}>Edit Account</Text>
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
  topButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    width: '100%',
    marginBottom: 8,
  },
  dashboardButton: {
    width: '48%',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  buttonImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1.875, // Maintains the original aspect ratio (150/80)
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