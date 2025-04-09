import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator, Modal, TextInput, Button } from 'react-native';
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
  wasteTypes: string;
}

const MapScreen = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestionMode, setSuggestionMode] = useState(false);
  const [suggestedLocation, setSuggestedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reason, setReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
          // latitude: location.coords.latitude,
          // longitude: location.coords.longitude,
          latitude:  6.864508658378935,
          longitude: 79.85970548542655,
        });

        // Fetch nearby bins - using a smaller radius for more relevant results
        const binsNearby = await getBinsNearby(location.coords.latitude, location.coords.longitude, 300);
        console.log(`Loaded ${binsNearby.length} bins from API`);
        const mappedBins: Bin[] = binsNearby.map((bin: any) => ({
          _id: bin._id,
          location: bin.location,
          fillLevel: bin.fillLevel,
          wasteTypes: bin.wasteTypes || 'unknown', // Ensure wasteTypes is always present
        }));
        setBins(mappedBins);
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
      const binsNearby = await getBinsNearby(location.latitude, location.longitude, 300);
      console.log(`Refreshed ${binsNearby.length} bins from API`);
      const mappedBins: Bin[] = binsNearby.map((bin: any) => ({
        _id: bin._id,
        location: bin.location,
        fillLevel: bin.fillLevel,
        wasteTypes: bin.wasteTypes || 'unknown', // Ensure wasteTypes is always present
      }));
      setBins(mappedBins);
    } catch (error) {
      console.error('Error refreshing bins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapRegionChange = (region: { latitude: number; longitude: number }) => {
    if (suggestionMode) {
      setSuggestedLocation({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  const handleConfirmSuggestion = () => {
    setShowConfirmDialog(true);
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestedLocation || !reason) return;

    try {
      // Replace with your API call to submit the suggestion
      console.log('Submitting suggestion:', { location: suggestedLocation, reason });
      Alert.alert('Success', 'Your suggestion has been submitted.');
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      Alert.alert('Error', 'Failed to submit your suggestion. Please try again.');
    } finally {
      setSuggestionMode(false);
      setShowConfirmDialog(false);
      setReason('');
      setSuggestedLocation(null);
    }
  };

  const toggleSuggestionMode = () => {
    if (suggestionMode) {
      // Exiting suggestion mode
      setSuggestionMode(false);
      setSuggestedLocation(null);
    } else {
      // Entering suggestion mode
      setSuggestionMode(true);
      if (location) {
        setSuggestedLocation({ latitude: location.latitude, longitude: location.longitude });
      }
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
            latitudeDelta: 0.005, // More zoomed-in view (smaller number = more zoom)
            longitudeDelta: 0.005, // More zoomed-in view
          }}
          onRegionChangeComplete={handleMapRegionChange}
        >
          {/* User location marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor="blue"
            title="Your Location"
          />
          
          {/* Bin markers */}
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
                {/* Fill level indicator with color based on percentage */}
                <View style={[styles.markerInner, { backgroundColor: getFillLevelColor(bin.fillLevel) }]}>
                  <Text style={styles.markerText}>{bin.fillLevel}%</Text>
                </View>
                {/* Waste type label */}
                <View style={styles.wasteTypeTag}>
                  <Text style={styles.wasteTypeText}>{getWasteTypeAbbreviation(bin.wasteTypes)}</Text>
                </View>
              </View>
            </Marker>
          ))}
          {suggestionMode && suggestedLocation && (
            <Marker
              coordinate={suggestedLocation}
              pinColor="red" // Change marker color to red for suggestion mode
            />
          )}
        </MapView>
      )}
      
      {/* Conditionally hide buttons when suggestion mode is enabled */}
      {!suggestionMode && (
        <>
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

          {/* Suggest Bin Button */}
          <TouchableOpacity 
            style={styles.suggestBinButton}
            onPress={toggleSuggestionMode} // Use the toggle function
          >
            <MaterialCommunityIcons name="delete" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Exit Suggestion Mode Button */}
      {suggestionMode && (
        <TouchableOpacity
          style={styles.exitSuggestionButton}
          onPress={toggleSuggestionMode} // Exit suggestion mode
        >
          <MaterialCommunityIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {selectedBin && (
        <View style={styles.binDetails}>
          <Text style={styles.binDetailsTitle}>Bin Details</Text>
          
          {/* Waste type indicator */}
          <View style={styles.binTypeIndicator}>
            <Text style={styles.binTypeText}>{getFullWasteTypeName(selectedBin.wasteTypes)}</Text>
          </View>
          
          {/* Fill level indicator with color matching the map marker */}
          <View style={styles.fillLevelContainer}>
            <Text style={styles.binDetailsText}>Fill Level: </Text>
            <View style={[styles.fillLevelIndicator, { backgroundColor: getFillLevelColor(selectedBin.fillLevel) }]}>
              <Text style={styles.fillLevelText}>{selectedBin.fillLevel}%</Text>
            </View>
          </View>
          
          <Text style={styles.binDetailsText}>Waste Type: {getWasteTypeAbbreviation(selectedBin.wasteTypes)}</Text>
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

const getWasteTypeAbbreviation = (wasteType: string) => {
  switch (wasteType.toLowerCase()) {
    case 'organic':
      return 'ORG';
    case 'recyclable':
      return 'REC';
    case 'general':
      return 'GEN';
    case 'hazardous':
      return 'HAZ';
    default:
      return 'UNK'; // Unknown
  }
};

const getFullWasteTypeName = (wasteType: string) => {
  switch (wasteType.toLowerCase()) {
    case 'organic':
      return 'Organic Waste';
    case 'recyclable':
      return 'Recyclable Waste';
    case 'general':
      return 'General Waste';
    case 'hazardous':
      return 'Hazardous Waste';
    default:
      return 'Unknown Type';
  }
};

const getWasteTypeColor = (wasteType: string) => {
  switch (wasteType.toLowerCase()) {
    case 'organic':
      return '#4CAF50'; // Green
    case 'recyclable':
      return '#2196F3'; // Blue
    case 'general':
      return '#9E9E9E'; // Gray
    case 'hazardous':
      return '#FF5722'; // Orange-red
    default:
      return '#9C27B0'; // Purple for unknown
  }
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
  suggestBinButton: {
    position: 'absolute',
    bottom: 80, // Position it above the bottom of the screen
    right: 20, // Align it to the right
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
  exitSuggestionButton: {
    position: 'absolute',
    top: 50, // Position it at the top
    right: 20, // Align it to the right
    backgroundColor: '#EF4444', // Red color for exit button
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
  wasteTypeTag: {
    marginTop: 4,
    backgroundColor: '#12805c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wasteTypeText: {
    color: '#fff',
    fontSize: 12,
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
  binDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#12805c',
  },
  binTypeIndicator: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  binTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  binDetailsText: {
    fontSize: 16,
    marginBottom: 8,
  },
  fillLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fillLevelIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  fillLevelText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dialogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dialogText: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
});

export default MapScreen;
