import axios from 'axios';

// Replace with your computer's IP address on your network
// Using localhost doesn't work when testing on physical devices
const API_IP = '192.168.30.197'; // Your computer's IP address on the Wi-Fi network
const API_PORT = '5000';
const API_BASE = `http://${API_IP}:${API_PORT}/api`;

// API is live, no longer using mock data
const USE_MOCK_DATA = false;

interface Bin {
  _id: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  fillLevel: number;
}

// Bin operations
export const getBinsNearby = async (latitude: number, longitude: number, radius: number): Promise<Bin[]> => {
  try {
    const response = await axios.get(`${API_BASE}/resident/bins/nearby`, {
      params: {
        latitude,
        longitude,
        radius,
      },
    });
    return response.data.bins.map((bin: Bin) => ({
      ...bin,
      location: {
        ...bin.location,
        coordinates: [bin.location.coordinates[0], bin.location.coordinates[1]] as [number, number],
      },
    }));
  } catch (error) {
    console.error('API: Failed to fetch bins nearby:', error);
    return []; // Return empty array if there's an error
  }
}

// Get detailed information about a specific bin
export const getBinDetails = async (binId: string): Promise<Bin | null> => {
  try {
    const response = await axios.get(`${API_BASE}/resident/bins/${binId}`);
    return response.data.bin;
  } catch (error) {
    console.error(`API: Failed to fetch bin details for ${binId}:`, error);
    return null;
  }
};
