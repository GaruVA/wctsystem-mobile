import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, LatLng } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SuggestBinDialog from '../components/SuggestBinDialog';

const SuggestBinScreen = ({ navigation }: { navigation: any }) => {
  const [coordinates, setCoordinates] = useState<LatLng>({ latitude: 0, longitude: 0 });
  const [dialogVisible, setDialogVisible] = useState(false);

  const handleConfirm = () => {
    setDialogVisible(true);
  };

  const handleSubmit = (reason: string) => {
    setDialogVisible(false);
    // Submit suggestion to backend
    console.log('Suggestion submitted:', { coordinates, reason });
    navigation.goBack(); // Return to the previous screen
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChangeComplete={(region) => {
          setCoordinates({ latitude: region.latitude, longitude: region.longitude });
        }}
      >
        <Marker coordinate={coordinates} title="Suggested Location" />
      </MapView>

      {/* Confirm Suggestion Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>Confirm Suggestion</Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  confirmButton: {
    position: 'absolute',
    bottom: 80,
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#12805c',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SuggestBinScreen;
