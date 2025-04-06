import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { getBinsNearby } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SuggestBinDialog from '../components/SuggestBinDialog';

interface Bin {
  _id: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  fillLevel: number;
}

const MapScreen = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestionMode, setSuggestionMode] = useState(false); // Track suggestion mode
  const [coordinates, setCoordinates] = useState<LatLng>({ latitude: 0, longitude: 0 }); // Default value
  const [dialogVisible, setDialogVisible] = useState(false); // Dialog for reason input

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission to access location was denied');
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Fetch bins within 500 meters radius
        const binsNearby = await getBinsNearby(location.coords.latitude, location.coords.longitude, 500);
        console.log(`Loaded ${binsNearby.length} bins from API`);
        setBins(binsNearby);
      } catch (error) {
        console.error('Error loading map data:', error);
        Alert.alert('Error', 'Failed to load map data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSuggestionMode = () => {
    setSuggestionMode((prev) => !prev);
  };

  const handleConfirm = () => {
    setDialogVisible(true); // Open dialog to input reason
  };

  const handleSubmit = (reason: string) => {
    setDialogVisible(false);
    // Submit suggestion to backend
    console.log('Suggestion submitted:', { coordinates, reason });
    setSuggestionMode(false); // Exit suggestion mode after submission
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#12805c" />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      )}

      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onRegionChangeComplete={(region) => {
            if (suggestionMode) {
              setCoordinates({ latitude: region.latitude, longitude: region.longitude });
            }
          }}
        >
          <Circle
            center={location}
            radius={500}
            strokeColor="rgba(0, 150, 255, 0.5)"
            fillColor="rgba(0, 150, 255, 0.1)"
          />
          {!suggestionMode &&
            bins.map((bin) => (
              <Marker
                key={bin._id}
                coordinate={{
                  latitude: bin.location.coordinates[1],
                  longitude: bin.location.coordinates[0],
                }}
                onPress={() => setSelectedBin(bin)}
              >
                <View style={styles.marker}>
                  <View style={[styles.markerInner, { backgroundColor: getFillLevelColor(bin.fillLevel) }]}>
                    <Text style={styles.markerText}>{bin.fillLevel}%</Text>
                  </View>
                </View>
              </Marker>
            ))}
          {suggestionMode && (
            <Marker
              coordinate={coordinates}
              title="Suggested Location"
            />
          )}
        </MapView>
      )}

      {/* Suggest Bin Button */}
      {!suggestionMode && (
        <TouchableOpacity
          style={styles.suggestBinButton}
          onPress={toggleSuggestionMode}
        >
          <MaterialCommunityIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Exit Suggestion Mode Button */}
      {suggestionMode && (
        <TouchableOpacity
          style={styles.exitButton}
          onPress={toggleSuggestionMode}
        >
          <Text style={styles.exitButtonText}>Exit Suggestion Mode</Text>
        </TouchableOpacity>
      )}

      {/* Confirm Suggestion Button */}
      {suggestionMode && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm Suggestion</Text>
        </TouchableOpacity>
      )}

      {selectedBin && (
        <View style={styles.binDetails}>
          <Text style={styles.binDetailsText}>Fill Level: {selectedBin.fillLevel}%</Text>
          <Text style={styles.binDetailsText}>Location: {selectedBin.location.coordinates[1].toFixed(6)}, {selectedBin.location.coordinates[0].toFixed(6)}</Text>
          <Text style={styles.binDetailsText}>Bin ID: {selectedBin._id}</Text>
        </View>
      )}

      {dialogVisible && (
        <SuggestBinDialog
          coordinates={coordinates}
          onSubmit={handleSubmit}
          onCancel={() => setDialogVisible(false)}
        />
      )}
    </View>
  );
};

const getFillLevelColor = (fillLevel: number) => {
  if (fillLevel >= 90) return '#EF4444';
  if (fillLevel >= 70) return '#F59E0B';
  if (fillLevel >= 50) return '#FBBF24';
  return '#10B981';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#12805c',
  },
  suggestBinButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#12805c',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#EF4444',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmButton: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  binDetails: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  binDetailsText: {
    fontSize: 16,
    marginBottom: 8,
  },
});

export default MapScreen;
