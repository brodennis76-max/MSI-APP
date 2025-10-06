import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';

const MSICalendar = ({ onBack }) => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    description: '',
    color: '#007AFF'
  });

  // Mock events for testing - these will be replaced with real API data
  const mockEvents = {
    '2025-01-15': [
      { 
        id: '1', 
        title: 'Store Inventory - ABC Market', 
        start: '2025-01-15T09:00:00', 
        end: '2025-01-15T17:00:00',
        description: 'Full store inventory count',
        color: '#007AFF' 
      },
      { 
        id: '2', 
        title: 'Team Meeting', 
        start: '2025-01-15T14:00:00', 
        end: '2025-01-15T15:00:00',
        description: 'Weekly team meeting',
        color: '#34C759' 
      }
    ],
    '2025-01-20': [
      { 
        id: '3', 
        title: 'Store Inventory - XYZ Grocery', 
        start: '2025-01-20T08:00:00', 
        end: '2025-01-20T16:00:00',
        description: 'Grocery store inventory count',
        color: '#FF9500' 
      }
    ],
    '2025-01-25': [
      { 
        id: '4', 
        title: 'Training Session', 
        start: '2025-01-25T10:00:00', 
        end: '2025-01-25T12:00:00',
        description: 'New employee training',
        color: '#FF3B30' 
      }
    ],
    // Add today's date with an event
    [moment().format('YYYY-MM-DD')]: [
      { 
        id: '5', 
        title: 'Today\'s Event', 
        start: moment().format('YYYY-MM-DDTHH:mm:ss'), 
        end: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
        description: 'This is an event for today',
        color: '#FF6B6B' 
      }
    ]
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call to MSI system
      // For now, we'll use mock data
      // The API endpoint would be: https://pegasus.msi-inv.com/admin/fullcalendar/events
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEvents(mockEvents);
      updateMarkedDates(mockEvents);
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

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      // TODO: Implement actual API call to add event
      // The API endpoint would be: https://pegasus.msi-inv.com/admin/fullcalendar/add_calendar_event
      
      const event = {
        id: Date.now().toString(),
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end,
        description: newEvent.description,
        color: newEvent.color
      };

      const eventDate = moment(newEvent.start).format('YYYY-MM-DD');
      const updatedEvents = { ...events };
      
      if (!updatedEvents[eventDate]) {
        updatedEvents[eventDate] = [];
      }
      
      updatedEvents[eventDate].push(event);
      
      setEvents(updatedEvents);
      updateMarkedDates(updatedEvents);
      setShowAddEventModal(false);
      setNewEvent({ title: '', start: '', end: '', description: '', color: '#007AFF' });
      
      Alert.alert('Success', 'Event added successfully!');
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    }
  };

  const deleteEvent = (eventId, eventDate) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedEvents = { ...events };
            if (updatedEvents[eventDate]) {
              updatedEvents[eventDate] = updatedEvents[eventDate].filter(event => event.id !== eventId);
              
              // If no events left for this date, remove the date key
              if (updatedEvents[eventDate].length === 0) {
                delete updatedEvents[eventDate];
              }
              
              setEvents(updatedEvents);
              updateMarkedDates(updatedEvents);
              Alert.alert('Success', 'Event deleted successfully!');
            }
          },
        },
      ]
    );
  };

  const editEvent = (event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      color: event.color
    });
    setShowEditEventModal(true);
  };

  const updateEvent = async () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const updatedEvents = { ...events };
      const oldEventDate = moment(editingEvent.start).format('YYYY-MM-DD');
      const newEventDate = moment(newEvent.start).format('YYYY-MM-DD');
      
      // Remove event from old date
      if (updatedEvents[oldEventDate]) {
        updatedEvents[oldEventDate] = updatedEvents[oldEventDate].filter(event => event.id !== editingEvent.id);
        if (updatedEvents[oldEventDate].length === 0) {
          delete updatedEvents[oldEventDate];
        }
      }
      
      // Add event to new date
      if (!updatedEvents[newEventDate]) {
        updatedEvents[newEventDate] = [];
      }
      
      updatedEvents[newEventDate].push({
        ...editingEvent,
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end,
        description: newEvent.description,
        color: newEvent.color
      });
      
      setEvents(updatedEvents);
      updateMarkedDates(updatedEvents);
      setShowEditEventModal(false);
      setEditingEvent(null);
      setNewEvent({ title: '', start: '', end: '', description: '', color: '#007AFF' });
      
      Alert.alert('Success', 'Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    }
  };

  const renderEvent = (event) => {
    const eventDate = moment(event.start).format('YYYY-MM-DD');
    
    return (
      <View key={event.id} style={[styles.eventItem, { borderLeftColor: event.color }]}>
        <TouchableOpacity 
          style={styles.eventContent}
          onPress={() => {
            Alert.alert(
              event.title,
              `${moment(event.start).format('h:mm A')} - ${moment(event.end).format('h:mm A')}\n\n${event.description || 'No description'}`,
              [
                { text: 'OK' },
                { 
                  text: 'Edit', 
                  onPress: () => editEvent(event)
                },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => deleteEvent(event.id, eventDate)
                }
              ]
            );
          }}
        >
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTime}>
            {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
          </Text>
          {event.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteEvent(event.id, eventDate)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getEventsForDate = (date) => {
    return events[date] || [];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>MSI Calendar</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowAddEventModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
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
            Events for {moment(selectedDate).format('MMMM D, YYYY')}
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

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddEventModal}
        onRequestClose={() => setShowAddEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Event</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Start Date/Time (YYYY-MM-DD HH:mm)"
              value={newEvent.start}
              onChangeText={(text) => setNewEvent({ ...newEvent, start: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Date/Time (YYYY-MM-DD HH:mm)"
              value={newEvent.end}
              onChangeText={(text) => setNewEvent({ ...newEvent, end: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAddEventModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addEventButton]} 
                onPress={addEvent}
              >
                <Text style={styles.modalButtonText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditEventModal}
        onRequestClose={() => setShowEditEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Start Date/Time (YYYY-MM-DD HH:mm)"
              value={newEvent.start}
              onChangeText={(text) => setNewEvent({ ...newEvent, start: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Date/Time (YYYY-MM-DD HH:mm)"
              value={newEvent.end}
              onChangeText={(text) => setNewEvent({ ...newEvent, end: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowEditEventModal(false);
                  setEditingEvent(null);
                  setNewEvent({ title: '', start: '', end: '', description: '', color: '#007AFF' });
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addEventButton]} 
                onPress={updateEvent}
              >
                <Text style={styles.modalButtonText}>Update Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#6c757d',
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
    alignItems: 'flex-start', // Left justify the content
  },
  calendar: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    alignSelf: 'flex-start', // Left justify the calendar
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
    alignSelf: 'stretch', // Make events section take full width
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
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
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  addEventButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MSICalendar;