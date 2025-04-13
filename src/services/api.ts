import axios from 'axios';

// Replace with your computer's IP address on your network
// Using localhost doesn't work when testing on physical devices
const API_IP = '192.168.1.22'; // Your computer's IP address on the Wi-Fi network
const API_PORT = '5000';
const API_BASE = `http://${API_IP}:${API_PORT}/api`;

// API is live, no longer using mock data
const USE_MOCK_DATA = false;

// Common interfaces
interface Bin {
  _id: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  fillLevel: number;
  address?: string;
  wasteType?: string;
}

interface Schedule {
  _id: string;
  name: string;
  areaId: {
    _id: string;
    name: string;
    geometry?: {
      type: string;
      coordinates: [number, number][][];
    };
    startLocation?: {
      type: string;
      coordinates: [number, number];
    };
    endLocation?: {
      type: string;
      coordinates: [number, number];
    };
  };
  collectorId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  date: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  route: Array<[number, number]>;
  distance: number;
  duration: number;
  binSequence: string[] | Bin[]; // Can be either bin IDs or populated bin objects
  actualStartTime?: string;
  actualEndTime?: string;
  notes?: string;
}

interface AreaData {
  areaName: string;
  areaID: string;
  geometry: {
    type: string;
    coordinates: [number, number][][];
  };
  bins: Bin[];
  startLocation: {
    type: string;
    coordinates: [number, number];
  };
  endLocation: {
    type: string;
    coordinates: [number, number];
  };
}

// Bin operations for resident app
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

// Collector API Operations
export const getCollectorArea = async (token: string): Promise<AreaData> => {
  console.log('API: Fetching collector area data');
  try {
    const response = await axios.get(`${API_BASE}/collector/area`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const areaData = response.data;
    console.log('API: Area data received', {
      areaName: areaData.areaName,
      binCount: areaData.bins?.length || 0,
    });

    return areaData;
  } catch (error) {
    console.error('API: Failed to fetch area data:', error);
    throw error;
  }
};

export const getCollectorSchedules = async (token: string, params?: { 
  fromDate?: string; 
  toDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: Schedule[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> => {
  console.log('API: Fetching collector schedules');
  try {
    // Use the collector-specific endpoint instead of the general schedules endpoint
    // This ensures only schedules assigned to the authenticated collector are returned
    const response = await axios.get(`${API_BASE}/collector/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    });
    
    console.log(`API: Retrieved ${response.data.data.length} schedules`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch schedules:', error);
    throw error;
  }
};

export const getScheduleById = async (scheduleId: string, token: string): Promise<Schedule> => {
  console.log(`API: Fetching schedule details for ${scheduleId}`);
  try {
    const response = await axios.get(`${API_BASE}/schedules/${scheduleId}?populateBins=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('API: Schedule details received');
    return response.data;
  } catch (error) {
    console.error(`API: Failed to fetch schedule details for ${scheduleId}:`, error);
    throw error;
  }
};

export const updateScheduleStatus = async (
  scheduleId: string, 
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled', 
  token: string
): Promise<Schedule> => {
  console.log(`API: Updating schedule ${scheduleId} status to ${status}`);
  try {
    const response = await axios.patch(
      `${API_BASE}/schedules/${scheduleId}`, 
      { status }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('API: Schedule status updated successfully');
    return response.data;
  } catch (error) {
    console.error('API: Failed to update schedule status:', error);
    throw error;
  }
};

// Export types for use in other files
export type { Bin, Schedule, AreaData };
