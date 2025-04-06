import React from 'react';
import { View, Text, Button } from 'react-native';
import { LatLng } from 'react-native-maps'; // Import LatLng type

interface SuggestBinBottomSheetProps {
  coordinates: LatLng;
  onConfirm: () => void;
  onCancel: () => void;
}

const SuggestBinBottomSheet: React.FC<SuggestBinBottomSheetProps> = ({ coordinates, onConfirm, onCancel }) => {
  return (
    <View>
      <Text>Coordinates: {coordinates.latitude}, {coordinates.longitude}</Text>
      <Button title="Confirm" onPress={onConfirm} />
      <Button title="Cancel" onPress={onCancel} />
    </View>
  );
};

export default SuggestBinBottomSheet;
