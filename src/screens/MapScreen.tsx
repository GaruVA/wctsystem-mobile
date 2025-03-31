import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { getBinsNearby } from '../services/api'; // Import the API function to get bins
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

  // Function to refresh bins data
  const refreshBins = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      const binsNearby = await getBinsNearby(location.latitude, location.longitude, 500);
      console.log(`Refreshed ${binsNearby.length} bins from API`);
      setBins(binsNearby);
    } catch (error) {
      console.error('Error refreshing bins:', error);
    } finally {
      setLoading(false);
    }
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
        >
          <Circle
            center={location}
            radius={500}
            strokeColor="rgba(0, 150, 255, 0.5)"
            fillColor="rgba(0, 150, 255, 0.1)"
          />
          {bins.map((bin) => (
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
        </MapView>
      )}
      
      {/* Truck Button */}
      <TouchableOpacity 
        style={styles.truckButton} 
        onPress={() => Alert.alert('Driver Section', 'Driver section functionality will be connected here.')}
      >
        <MaterialCommunityIcons name="truck" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={refreshBins}
        disabled={loading}
      >
        <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
      
      {selectedBin && (
        <View style={styles.binDetails}>
          <Text style={styles.binDetailsText}>Fill Level: {selectedBin.fillLevel}%</Text>
          <Text style={styles.binDetailsText}>Location: {selectedBin.location.coordinates[1].toFixed(6)}, {selectedBin.location.coordinates[0].toFixed(6)}</Text>
          <Text style={styles.binDetailsText}>Bin ID: {selectedBin._id}</Text>
        </View>
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
    ...StyleSheet.absoluteFillObject,
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
  truckButton: {
    position: 'absolute',
    top: 50,
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
  refreshButton: {
    position: 'absolute',
    top: 50,
    right: 80,
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
    color: '#fff',
    fontWeight: 'bold',
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
