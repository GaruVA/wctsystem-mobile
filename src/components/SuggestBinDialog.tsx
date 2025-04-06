import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { LatLng } from 'react-native-maps'; // Import LatLng type

interface SuggestBinDialogProps {
  coordinates: LatLng;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

const SuggestBinDialog: React.FC<SuggestBinDialogProps> = ({ coordinates, onSubmit, onCancel }) => {
  const [reason, setReason] = useState('');

  return (
    <View>
      <Text>Coordinates: {coordinates.latitude}, {coordinates.longitude}</Text>
      <TextInput
        placeholder="Enter reason for suggestion"
        value={reason}
        onChangeText={setReason}
      />
      <Button title="Submit" onPress={() => onSubmit(reason)} />
      <Button title="Cancel" onPress={onCancel} />
    </View>
  );
};

export default SuggestBinDialog;
