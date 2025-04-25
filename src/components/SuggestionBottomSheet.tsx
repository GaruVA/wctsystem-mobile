import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface SuggestionBottomSheetProps {
  coordinates: { latitude: number; longitude: number } | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const SuggestionBottomSheet: React.FC<SuggestionBottomSheetProps> = ({ coordinates, onConfirm, isLoading = false  }) => {
  return (
    <View style={styles.container}>
      {coordinates && (
        <Text style={styles.coordinates}>
          Selected Location: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </Text>
      )}
      <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={isLoading}>
      {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  coordinates: {
    fontSize: 16,
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: '#12805c',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmButtonDisabled: {
    backgroundColor: '#84c4b1',
  },
});

export default SuggestionBottomSheet;
