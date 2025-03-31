// Mock data for development before backend is implemented
export const mockBins = [
  {
    _id: '1',
    location: {
      type: 'Point',
      coordinates: [79.85912120574592, 6.8720590105035315]// Example coordinates (longitude, latitude)
    },
    fillLevel: 75
  },
  {
    _id: '2',
    location: {
      type: 'Point',
      coordinates: [79.8621, 6.8667]
    },
    fillLevel: 30
  },
  {
    _id: '3', 
    location: {
      type: 'Point',
      coordinates: [79.85907829040463, 6.8707381906946186]
    },
    fillLevel: 90
  },
  {
    _id: '4',
    location: {
      type: 'Point',
      coordinates: [79.85924995176988, 6.870162993824585]
    },
    fillLevel: 50
  }
];

// Helper function to calculate distance between two points
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c * 1000; // Distance in meters
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

// Simulates fetching bins within a radius
export const getMockBinsNearby = (latitude: number, longitude: number, radius: number) => {
  return mockBins.filter(bin => {
    const distance = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      bin.location.coordinates[1], // latitude is second in GeoJSON
      bin.location.coordinates[0]  // longitude is first in GeoJSON
    );
    // return distance <= radius;
    return true;
  });
};