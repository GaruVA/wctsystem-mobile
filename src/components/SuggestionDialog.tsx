import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';

interface SuggestionDialogProps {
  visible: boolean;
  coordinates: { latitude: number; longitude: number } | null;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const SuggestionDialog: React.FC<SuggestionDialogProps> = ({ visible, coordinates, onSubmit, onCancel, isSubmitting = false }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason); // Call the parent-provided onSubmit handler
      setReason(''); // Reset the reason input
      onCancel(); // Close the dialog
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Confirm Suggestion</Text>
          {coordinates && (
            <Text style={styles.coordinates}>
              Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </Text>
          )}
          <TextInput
            style={styles.input}
            placeholder="Enter reason for suggestion"
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top" // Ensures text starts at the top of the box
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !reason.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!reason.trim()} // Disable button if no reason is provided
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  coordinates: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 100, // Larger text box
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#EF4444', // Red color for cancel button
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#10B981', // Green color for submit button
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB', // Light gray for disabled state
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SuggestionDialog;
