import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const SimpleCalendar = ({ onBack }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});

  // Mock events for testing
  const mockEvents = {
    '2024-01-15': [
      { id: '1', title: 'Store Inventory - ABC Market', time: '9:00 AM - 5:00 PM', color: '#007AFF' },
      { id: '2', title: 'Team Meeting', time: '2:00 PM - 3:00 PM', color: '#34C759' }
    ],
    '2024-01-20': [
      { id: '3', title: 'Store Inventory - XYZ Grocery', time: '8:00 AM - 4:00 PM', color: '#FF9500' }
    ],
    '2024-01-25': [
      { id: '4', title: 'Training Session', time: '10:00 AM - 12:00 PM', color: '#FF3B30' }
    ]
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // For now, we'll use mock data since we need to implement proper authentication
      // In the future, this will make actual API calls to the MSI system
      console.log('Fetching calendar events...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEvents(mockEvents);
      updateMarkedDates(mockEvents);
      
      console.log('Events loaded successfully');
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load calendar events. Using sample data.');
      setEvents(mockEvents);
      updateMarkedDates(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = (eventsData) => {
    const marked = {};
    
    // Mark dates with events
    Object.keys(eventsData).forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: eventsData[date][0]?.color || '#007AFF',
      };
    });
    
    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        selected: true,
        selectedColor: '#007AFF',
        selectedTextColor: '#ffffff',
      };
    }
    
    setMarkedDates(marked);
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const renderEvent = (event) => (
    <View key={event.id} style={[styles.eventItem, { borderLeftColor: event.color }]}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventTime}>{event.time}</Text>
    </View>
  );

  const getEventsForDate = (date) => {
    return events[date] || [];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>MSI Calendar</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Calendar
          style={styles.calendar}
          current={selectedDate}
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: '#007AFF',
            todayTextColor: '#007AFF',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            dotColor: '#00adf5',
            selectedDotColor: '#ffffff',
            arrowColor: '#007AFF',
            monthTextColor: '#2d4150',
            indicatorColor: '#007AFF',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13
          }}
        />
        
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            Events for {new Date(selectedDate).toLocaleDateString()}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : (
            <ScrollView style={styles.eventsList}>
              {getEventsForDate(selectedDate).length > 0 ? (
                getEventsForDate(selectedDate).map(renderEvent)
              ) : (
                <Text style={styles.emptyText}>No events for this date</Text>
              )}
            </ScrollView>
          )}
        </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  calendar: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  eventsSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  eventsList: {
    flex: 1,
  },
  eventItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});

export default SimpleCalendar;
