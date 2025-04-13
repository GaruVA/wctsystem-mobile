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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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
  const bottomSheetRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(true);
  
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
        edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
        animated: true,
      }
    );
  };
  
  // Toggle bottom sheet
  const toggleBottomSheet = () => {
    setBottomSheetOpen(!bottomSheetOpen);
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
      
      {/* Map View */}
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
              lineDashPattern={[0]}
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
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={{
                width: 14,
                height: 14,
                borderRadius: 50,
                backgroundColor: 'green',
                borderWidth: 2,
                borderColor: 'white',
              }} />
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
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={{
                width: 14,
                height: 14,
                borderRadius: 50,
                backgroundColor: 'blue',
                borderWidth: 2,
                borderColor: 'white',
              }} />
            </Marker>
          )}
          
          {/* Bin Markers */}
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
              >
                {/* Custom Bin Marker */}
                <View style={{
                  position: 'relative',
                  width: 24,
                  height: 28,
                }}>
                  {/* Main Bin Icon - Color based on fill level */}
                  <View style={{
                    width: 24,
                    height: 24,
                    backgroundColor: getBinFillColor(bin.fillLevel || 0),
                    borderRadius: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 2,
                    elevation: 3,
                  }}>
                    <Text style={{
                      color: 'white',
                      fontSize: 8,
                      fontWeight: 'bold',
                    }}>
                      {bin.fillLevel || 0}%
                    </Text>
                  </View>
                  
                  {/* Waste Type Label */}
                  <View style={{
                    position: 'absolute',
                    bottom: -5,
                    left: 0,
                    width: '100%',
                    alignItems: 'center',
                  }}>
                    <View style={{
                      backgroundColor: 'white',
                      borderRadius: 2,
                      paddingHorizontal: 2,
                    }}>
                      <Text style={{
                        fontSize: 9,
                        fontWeight: 'bold',
                      }}>
                        {bin.wasteType ? bin.wasteType.substring(0, 3) : 'GEN'}
                      </Text>
                    </View>
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
      
      {/* Bottom Sheet */}
      <View style={[
        styles.bottomSheet,
        { height: bottomSheetOpen ? 280 : 65 }
      ]}>
        {/* Bottom Sheet Header */}
        <TouchableOpacity style={styles.bottomSheetHeader} onPress={toggleBottomSheet}>
          <View style={styles.bottomSheetHeaderContent}>
            <Text style={styles.bottomSheetTitle}>Collection Details</Text>
            <MaterialCommunityIcons
              name={bottomSheetOpen ? "chevron-down" : "chevron-up"}
              size={24}
              color="#333333"
            />
          </View>
        </TouchableOpacity>
        
        {/* Bottom Sheet Content */}
        {bottomSheetOpen && (
          <View style={styles.bottomSheetContent}>
            {/* Schedule Info */}
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleDetail}>
                <MaterialCommunityIcons name="calendar" size={20} color="#666666" />
                <Text style={styles.scheduleDetailText}>
                  {format(new Date(schedule.date), 'MMMM d, yyyy')}
                </Text>
              </View>
              
              <View style={styles.scheduleDetail}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#666666" />
                <Text style={styles.scheduleDetailText}>
                  {(() => {
                    try {
                      const startTimeStr = schedule.startTime ? 
                        format(new Date(`1970-01-01T${schedule.startTime}`), 'h:mm a') : 
                        'No start time';
                        
                      const endTimeStr = schedule.endTime ? 
                        ` - ${format(new Date(`1970-01-01T${schedule.endTime}`), 'h:mm a')}` : 
                        '';
                        
                      return `${startTimeStr}${endTimeStr}`;
                    } catch (error) {
                      console.log('Error formatting time:', error);
                      return 'Time not available';
                    }
                  })()}
                </Text>
              </View>
              
              <View style={styles.scheduleStats}>
                <View style={styles.statItem}>
                  <FontAwesome5 name="trash-alt" size={16} color="#666" />
                  <Text style={styles.statText}>
                    {schedule.binSequence && Array.isArray(schedule.binSequence) ? schedule.binSequence.length : 0} bins
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <FontAwesome5 name="road" size={16} color="#666" />
                  <Text style={styles.statText}>
                    {schedule.distance ? schedule.distance.toFixed(1) : "0.0"} km
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <FontAwesome5 name="clock" size={16} color="#666" />
                  <Text style={styles.statText}>
                    {schedule.duration ? Math.round(schedule.duration) : 0} min
                  </Text>
                </View>
              </View>
              
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={[styles.statusBadge, getStatusStyle(schedule.status)]}>
                  <Text style={styles.statusText}>{schedule.status}</Text>
                </View>
              </View>
            </View>
            
            {/* Action Button */}
            {schedule.status === 'scheduled' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleStartCollection}
              >
                <Text style={styles.actionButtonText}>Start Collection</Text>
                <MaterialCommunityIcons name="play-circle-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            
            {schedule.status === 'in-progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.continueButton]}
                onPress={() => {
                  Alert.alert('Collection in Progress', 'Continue with your collection route.');
                }}
              >
                <Text style={styles.actionButtonText}>Continue Collection</Text>
                <MaterialCommunityIcons name="progress-check" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            
            {(schedule.status === 'completed' || schedule.status === 'cancelled') && (
              <TouchableOpacity
                style={[styles.actionButton, styles.viewDetailsButton]}
                onPress={() => {
                  Alert.alert('Collection Details', 'View collection history details.');
                }}
              >
                <Text style={styles.actionButtonText}>View Details</Text>
                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
    flex: 1,
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
  startMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 8,
  },
  endMarker: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    padding: 8,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
  },
  bottomSheetHeader: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  bottomSheetHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomSheetContent: {
    paddingVertical: 15,
  },
  scheduleInfo: {
    marginBottom: 15,
  },
  scheduleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleDetailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  scheduleStats: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 10,
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
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#12805c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  continueButton: {
    backgroundColor: '#FFA000',
  },
  viewDetailsButton: {
    backgroundColor: '#5C6BC0',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
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