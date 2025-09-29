import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";

// Database API endpoints (replace with your actual endpoints)
const API_BASE_URL = "https://your-api.com/api";

// Default options for when API fails
const defaultClientOptions = [
  { label: "Select Client", value: "" },
  { label: "49 WINE & LIQUOR", value: "1" },
  { label: "RUSSELL S/M", value: "4" },
  { label: "ALLEN'S SUPERMARKET", value: "7" },
  { label: "DART COMMERCIAL SERVICES", value: "12" },
];

const defaultDivisionOptions = [
  { label: "Select Division", value: "" },
  { label: "AUTRY GREER & SONS, INC.", value: "10" },
  { label: "FOOD GIANT SUPERMARKETS", value: "95" },
  { label: "HOUCHENS INDUSTRIAL, INC.", value: "129" },
  { label: "LIPSCOMB OIL COMPANY, INC", value: "166" },
];

const defaultStoreOptions = [
  { label: "Select Store", value: "" },
  { label: "Store 1", value: "1" },
  { label: "Store 2", value: "2" },
  { label: "Store 3", value: "3" },
];

export default function AccInstPickerWithDB() {
  const [eventType, setEventType] = useState("Upcoming Events");
  const [client, setClient] = useState("");
  const [division, setDivision] = useState("");
  const [store, setStore] = useState("");
  
  // State for database data
  const [clientOptions, setClientOptions] = useState(defaultClientOptions);
  const [divisionOptions, setDivisionOptions] = useState(defaultDivisionOptions);
  const [storeOptions, setStoreOptions] = useState(defaultStoreOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data from database on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch all initial data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchClients(),
        fetchStores(),
        fetchDivisions()
      ]);
    } catch (err) {
      setError("Failed to load data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients from database
  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      
      // Transform database data to picker format
      const clients = [
        { label: "Select Client", value: "" },
        ...data.map(client => ({
          label: client.name,
          value: client.id.toString()
        }))
      ];
      setClientOptions(clients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      // Keep default options on error
    }
  };

  // Fetch stores from database
  const fetchStores = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stores`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      const data = await response.json();
      
      const stores = [
        { label: "Select Store", value: "" },
        ...data.map(store => ({
          label: store.name,
          value: store.id.toString()
        }))
      ];
      setStoreOptions(stores);
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  };

  // Fetch divisions from database
  const fetchDivisions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/divisions`);
      if (!response.ok) throw new Error('Failed to fetch divisions');
      const data = await response.json();
      
      const divisions = [
        { label: "Select Division", value: "" },
        ...data.map(division => ({
          label: division.name,
          value: division.id.toString()
        }))
      ];
      setDivisionOptions(divisions);
    } catch (err) {
      console.error("Error fetching divisions:", err);
    }
  };

  // Fetch divisions for a specific client
  const fetchDivisionsForClient = async (clientId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/divisions`);
      if (!response.ok) throw new Error('Failed to fetch client divisions');
      const data = await response.json();
      
      const divisions = [
        { label: "Select Division", value: "" },
        ...data.map(division => ({
          label: division.name,
          value: division.id.toString()
        }))
      ];
      setDivisionOptions(divisions);
    } catch (err) {
      console.error("Error fetching client divisions:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Account Instructions</Text>
        <ActivityIndicator size="large" color="#333333" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.heading}>Account Instructions</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Main picker - only shows when eventType is Upcoming Events */}
      {eventType === "Upcoming Events" && (
        <Picker
          selectedValue={eventType}
          onValueChange={(val) => setEventType(val)}
          style={styles.picker}
        >
          <Picker.Item label="Upcoming Events" value="Upcoming Events" />
          <Picker.Item label="Store" value="Store" />
          <Picker.Item label="Client" value="Client" />
          <Picker.Item label="Area" value="Area" />
        </Picker>
      )}

      {/* Store Picker - replaces main picker when Store is selected */}
      {eventType === "Store" && (
        <Picker
          selectedValue={store}
          onValueChange={(val) => {
            setStore(val);
            if (val !== "") {
              // Replace with division picker when store is selected
              setEventType("Division");
              setClient(""); // Reset client
              setDivision("");
            }
          }}
          style={styles.picker}
        >
          {storeOptions.map((s) => (
            <Picker.Item key={s.value} label={s.label} value={s.value} />
          ))}
        </Picker>
      )}

      {/* Client Picker - replaces main picker when Client is selected */}
      {eventType === "Client" && (
        <Picker
          selectedValue={client}
          onValueChange={async (val) => {
            setClient(val);
            if (val !== "") {
              // Fetch divisions for this specific client
              await fetchDivisionsForClient(val);
              // Replace with division picker when client is selected
              setEventType("Division");
              setStore(""); // Reset store
              setDivision("");
            }
          }}
          style={styles.picker}
        >
          {clientOptions.map((c) => (
            <Picker.Item key={c.value} label={c.label} value={c.value} />
          ))}
        </Picker>
      )}

      {/* Division Picker - replaces previous picker */}
      {eventType === "Division" && (
        <Picker
          selectedValue={division}
          onValueChange={(val) => setDivision(val)}
          style={styles.picker}
        >
          {divisionOptions.map((d) => (
            <Picker.Item key={d.value} label={d.label} value={d.value} />
          ))}
        </Picker>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  heading: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 0 
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginVertical: 0,
    height: 40,
  },
});
