import React, { useState } from 'react';
import { Marker } from 'react-native-maps';
import { LatLng, Region } from 'react-native-maps'; // Import types

const MapDisplay = ({ suggestionMode }: { suggestionMode: boolean }) => {
  const [centerCoordinates, setCenterCoordinates] = useState<LatLng>({ latitude: 0, longitude: 0 });

  const handleRegionChange = (region: Region) => {
    if (suggestionMode) {
      setCenterCoordinates({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  return (
    <>
      {suggestionMode && (
        <Marker
          coordinate={centerCoordinates} // Ensure correct LatLng type
          title="Suggested Location"
        />
      )}
    </>
  );
};

export default MapDisplay;