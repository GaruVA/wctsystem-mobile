import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useCollectorAuth } from '../context/CollectorAuthContext';
import { RootStackParamList } from '../navigation/types';
import { getScheduleById, updateScheduleStatus, type Schedule, type Bin } from '../services/api';

type CollectorRouteNavigationProp = StackNavigationProp<RootStackParamList, 'CollectorRoute'>;
type CollectorRouteRouteProp = RouteProp<RootStackParamList, 'CollectorRoute'>;

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const CollectorRouteScreen = () => {
  const navigation = useNavigation<CollectorRouteNavigationProp>();
  const route = useRoute<CollectorRouteRouteProp>();
  const { scheduleId } = route.params;
  const { token } = useCollectorAuth();
  const mapRef = useRef<MapView>(null);
  
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selectedBin, setSelectedBin] = useState<(Bin & { index: number }) | null>(null);
  
  // Get schedule details
  useEffect(() => {
    const loadScheduleDetails = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const scheduleData = await getScheduleById(scheduleId, token);
        setSchedule(scheduleData);
        
        // Center map on the route
        if (scheduleData && scheduleData.route && scheduleData.route.length > 0) {
          const initialCoordinate = {
            latitude: scheduleData.route[0][1],  // Fixed: Using longitude/latitude in correct order
            longitude: scheduleData.route[0][0], // Fixed: Using longitude/latitude in correct order
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          };
          mapRef.current?.animateToRegion(initialCoordinate, 1000);
        }
      } catch (error) {
        console.error('Error loading schedule details:', error);
        Alert.alert('Error', 'Failed to load schedule information. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadScheduleDetails();
  }, [token, scheduleId]);

  // Start collection process
  const handleStartCollection = async () => {
    if (!schedule || !token) return;
    
    try {
      // Only allow starting if the status is 'scheduled'
      if (schedule.status !== 'scheduled') {
        Alert.alert(
          'Cannot Start Collection',
          'This collection is already in progress or has been completed.'
        );
        return;
      }
      
      // Update the status to 'in-progress'
      const updatedSchedule = await updateScheduleStatus(schedule._id, 'in-progress', token);
      setSchedule(updatedSchedule);
      
      // Show confirmation to the user
      Alert.alert(
        'Collection Started',
        'Your collection route has been started. Follow the map to complete your collection.'
      );
    } catch (error) {
      console.error('Error starting collection:', error);
      Alert.alert('Error', 'Failed to start collection. Please try again.');
    }
  };
  
  // Map bounds calculation for route
  const getMapBounds = useMemo(() => {
    if (!schedule || !schedule.route || schedule.route.length === 0) {
      return null;
    }
    
    let minLat = schedule.route[0][1]; // Fixed: Using longitude/latitude in correct order
    let maxLat = schedule.route[0][1]; // Fixed: Using longitude/latitude in correct order
    let minLng = schedule.route[0][0]; // Fixed: Using longitude/latitude in correct order
    let maxLng = schedule.route[0][0]; // Fixed: Using longitude/latitude in correct order
    
    schedule.route.forEach((point) => {
      minLat = Math.min(minLat, point[1]); // Fixed: Using longitude/latitude in correct order
      maxLat = Math.max(maxLat, point[1]); // Fixed: Using longitude/latitude in correct order
      minLng = Math.min(minLng, point[0]); // Fixed: Using longitude/latitude in correct order
      maxLng = Math.max(maxLng, point[0]); // Fixed: Using longitude/latitude in correct order
    });
    
    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
    };
  }, [schedule]);
  
  // Fit map to show the entire route
  const fitMapToRoute = () => {
    if (!getMapBounds || !mapRef.current) return;
    
    const { minLat, maxLat, minLng, maxLng } = getMapBounds;
    
    mapRef.current.fitToCoordinates(
      [
        { latitude: minLat, longitude: minLng },
        { latitude: maxLat, longitude: maxLng },
      ],
      {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      }
    );
  };
  
  // Return to collector main screen
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#12805c" />
        <Text style={styles.loadingText}>Loading collection details...</Text>
      </View>
    );
  }
  
  if (!schedule) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e57373" />
        <Text style={styles.errorText}>Schedule not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      
      {/* Map View - Taking up approximately 60% of screen height */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: schedule.route && schedule.route.length > 0 ? schedule.route[0][1] : 7.8731,  
            longitude: schedule.route && schedule.route.length > 0 ? schedule.route[0][0] : 80.7718,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          onMapReady={fitMapToRoute}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {/* Route Polyline */}
          {schedule.route && schedule.route.length > 0 && (
            <Polyline
              coordinates={schedule.route.map((point) => ({
                latitude: point[1],
                longitude: point[0],
              }))}
              strokeWidth={4}
              strokeColor="#12805c"
            />
          )}
          
          {/* Start Location Marker - Using area's fixed start location */}
          {schedule.areaId && schedule.areaId.startLocation && schedule.areaId.startLocation.coordinates && (
            <Marker
              coordinate={{
                latitude: schedule.areaId.startLocation.coordinates[1],
                longitude: schedule.areaId.startLocation.coordinates[0],
              }}
              title="Start"
              description="Depot - Start Point"
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={styles.startMarkerContainer}>
                <MaterialCommunityIcons name="home-variant" size={16} color="#FFF" />
              </View>
            </Marker>
          )}
          
          {/* End Location Marker - Using area's fixed end location */}
          {schedule.areaId && schedule.areaId.endLocation && schedule.areaId.endLocation.coordinates && (
            <Marker
              coordinate={{
                latitude: schedule.areaId.endLocation.coordinates[1],
                longitude: schedule.areaId.endLocation.coordinates[0],
              }}
              title="End"
              description="Offload Facility"
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={styles.endMarkerContainer}>
                <MaterialCommunityIcons name="factory" size={16} color="#FFF" />
              </View>
            </Marker>
          )}
          
          {/* Bin Markers - Numbered as per specification */}
          {schedule.binSequence && Array.isArray(schedule.binSequence) && schedule.binSequence.map((binItem: any, index: number) => {
            // Check if the bin item is a string ID or a populated bin object
            // If it's a string ID, we can't show it yet as we don't have the bin data
            if (typeof binItem === 'string') {
              console.log(`Bin ${index} is a string ID and can't be displayed: ${binItem}`);
              return null;
            }
            
            const bin = binItem;
            
            // Skip bins that don't have proper location data
            if (!bin || !bin.location || !bin.location.coordinates || 
                !Array.isArray(bin.location.coordinates) || bin.location.coordinates.length < 2) {
              console.log(`Skipping bin at index ${index} due to missing coordinates`);
              return null;
            }
            
            return (
              <Marker
                key={bin._id || `bin-${index}`}
                coordinate={{
                  latitude: bin.location.coordinates[1],
                  longitude: bin.location.coordinates[0],
                }}
                title={`Bin ${index + 1}`}
                description={`Fill Level: ${bin.fillLevel || 0}% - ${bin.wasteType || 'General'}`}
                anchor={{x: 0.5, y: 0.5}}
                onPress={() => {
                  // Center map on selected bin
                  mapRef.current?.animateToRegion({
                    latitude: bin.location.coordinates[1],
                    longitude: bin.location.coordinates[0],
                    latitudeDelta: LATITUDE_DELTA / 2,
                    longitudeDelta: LONGITUDE_DELTA / 2,
                  }, 500);
                  
                  // Also highlight this bin in the list below
                  setSelectedBin({...bin, index});
                }}
              >
                {/* Custom Bin Marker */}
                <View style={styles.binMarkerContainer}>
                  {/* Main Bin Icon - Color based on fill level */}
                  <View style={[
                    styles.binMarker, 
                    { backgroundColor: getBinFillColor(bin.fillLevel || 0) }
                  ]}>
                    <Text style={styles.binMarkerNumber}>{index + 1}</Text>
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButtonMap} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={fitMapToRoute}>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bin Stops List - Bottom section */}
      <View style={styles.stopsContainer}>
        <View style={styles.stopsHeader}>
          <Text style={styles.stopsTitle}>Collection Stops</Text>
          <Text style={styles.stopsSubtitle}>
            {schedule.binSequence && Array.isArray(schedule.binSequence) ? schedule.binSequence.length : 0} bins total
          </Text>
        </View>
        
        {/* Scrollable List of Stops */}
        <FlatList
          data={Array.isArray(schedule.binSequence) ? 
            // Filter out any string items, only pass bin objects to FlatList
            schedule.binSequence.filter(item => typeof item !== 'string') as Bin[] : 
            []
          }
          keyExtractor={(item, index) => item._id || `stop-${index}`}
          renderItem={({ item, index }) => {
            const bin = item as Bin;
            
            return (
              <TouchableOpacity 
                style={[
                  styles.stopItem,
                  selectedBin?._id === bin._id ? styles.selectedStopItem : null
                ]}
                onPress={() => {
                  // Center map on bin
                  mapRef.current?.animateToRegion({
                    latitude: bin.location.coordinates[1],
                    longitude: bin.location.coordinates[0],
                    latitudeDelta: LATITUDE_DELTA / 2,
                    longitudeDelta: LONGITUDE_DELTA / 2,
                  }, 500);
                  
                  // Highlight this bin in the list
                  setSelectedBin({...bin, index});
                }}
              >
                <View style={styles.stopNumberContainer}>
                  <View style={[
                    styles.stopNumberBadge,
                    { backgroundColor: getBinFillColor(bin.fillLevel || 0) }
                  ]}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                </View>
                
                <View style={styles.stopDetails}>
                  <View style={styles.stopDetailsRow}>
                    <Text style={styles.stopBinId}>Bin ID: {bin._id.substring(bin._id.length - 8)}</Text>
                    <MaterialCommunityIcons name="information-outline" size={16} color="#12805c" />
                  </View>
                  
                  <View style={styles.fillLevelContainer}>
                    <Text style={styles.fillLevelText}>Fill Level:</Text>
                    <View style={styles.fillLevelBar}>
                      <View 
                        style={[
                          styles.fillLevelIndicator, 
                          { 
                            width: `${bin.fillLevel || 0}%`,
                            backgroundColor: getBinFillColor(bin.fillLevel || 0)
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.fillLevelPercentage}>{bin.fillLevel || 0}%</Text>
                  </View>
                  
                  {bin.wasteType && (
                    <View style={styles.wasteTypeContainer}>
                      <Text style={styles.wasteTypeLabel}>{bin.wasteType}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
      </View>
      
      {/* Start Collection Button (FAB) */}
      {schedule.status === 'scheduled' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleStartCollection}
        >
          <MaterialCommunityIcons name="play" size={24} color="#ffffff" />
          <Text style={styles.fabText}>Start Collection</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

// Helper function for status styles
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'scheduled':
      return styles.statusScheduled;
    case 'in-progress':
      return styles.statusInProgress;
    case 'completed':
      return styles.statusCompleted;
    case 'cancelled':
      return styles.statusCancelled;
    default:
      return {};
  }
};

// Helper function to get bin fill level color, matching the Leaflet map
const getBinFillColor = (fillLevel: number): string => {
  if (fillLevel >= 90) return '#EF4444'; // Red - Critical 
  if (fillLevel >= 70) return '#F59E0B'; // Orange - High
  if (fillLevel >= 50) return '#FBBF24'; // Yellow - Medium
  return '#10B981'; // Green - Low
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#12805c',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e57373',
    marginVertical: 12,
  },
  mapContainer: {
    height: '60%', // Take up 60% of the screen height
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButtonMap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 15,
    backgroundColor: '#12805c',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  mapControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    right: 15,
    alignItems: 'center',
  },
  mapControlButton: {
    backgroundColor: '#12805c',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  startMarkerContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  endMarkerContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3F51B5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  binMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  binMarker: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  binMarkerNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stopsContainer: {
    height: '40%', // Take up 40% of screen height
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    paddingBottom: 90, // Overlap the map slightly
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stopsSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  stopItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedStopItem: {
    borderColor: '#12805c',
    borderWidth: 2,
  },
  stopNumberContainer: {
    marginRight: 12,
  },
  stopNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stopDetails: {
    flex: 1,
  },
  stopDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopBinId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fillLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fillLevelText: {
    fontSize: 12,
    color: '#666',
    width: 65,
  },
  fillLevelBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  fillLevelIndicator: {
    height: '100%',
  },
  fillLevelPercentage: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  wasteTypeContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  wasteTypeLabel: {
    fontSize: 12,
    color: '#2E7D32',
  },
  separator: {
    height: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#12805c',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusScheduled: {
    backgroundColor: '#E3F2FD',
  },
  statusInProgress: {
    backgroundColor: '#FFF8E1',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#12805c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CollectorRouteScreen;