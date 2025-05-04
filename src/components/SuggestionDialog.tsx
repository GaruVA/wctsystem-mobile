import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SuggestionDialogProps {
  visible: boolean;
  coordinates: { latitude: number; longitude: number } | null;
  onSubmit: (reason: string, binType: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const SuggestionDialog: React.FC<SuggestionDialogProps> = ({ 
  visible, 
  coordinates, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [reason, setReason] = useState('');
  const [selectedBinType, setSelectedBinType] = useState<string>('');

  const handleSubmit = () => {
    if (reason.trim() && selectedBinType) {
      onSubmit(reason, selectedBinType); // Call the parent-provided onSubmit handler with reason and binType
      setReason(''); // Reset the reason input
      setSelectedBinType(''); // Reset the selected bin type
      onCancel(); // Close the dialog
    }
  };

  const binTypes = [
    { id: 'general', name: 'General', color: '#FFFF00', icon: 'delete' },
    { id: 'organic', name: 'Organic', color: '#4CAF50', icon: 'leaf' },
    { id: 'recyclable', name: 'Recyclable', color: '#2196F3', icon: 'recycle' },
    { id: 'hazardous', name: 'Hazardous', color: '#FF5722', icon: 'alert' },

  ];

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
            textAlignVertical="top"
          />
          
          <Text style={styles.binTypeTitle}>Select Bin Type:</Text>
          <View style={styles.binTypeContainer}>
            {binTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.binTypeButton,
                  selectedBinType === type.id && styles.binTypeButtonSelected,
                  { borderColor: type.color }
                ]}
                onPress={() => setSelectedBinType(type.id)}
              >
                <MaterialCommunityIcons 
                  name="delete" 
                  size={24} 
                  color={type.color} 
                />
                <Text style={styles.binTypeText}>{type.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton, 
                (!reason.trim() || !selectedBinType) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!reason.trim() || !selectedBinType} // Disable button if no reason or bin type is provided
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
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  binTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  binTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  binTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#f5f5f5',
  },
  binTypeButtonSelected: {
    backgroundColor: '#e0e0e0',
  },
  binTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
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
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SuggestionDialog;
