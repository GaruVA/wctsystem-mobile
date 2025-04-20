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
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useCollectorAuth } from '../context/CollectorAuthContext';
import { RootStackParamList } from '../navigation/types';
import { getScheduleById, updateScheduleStatus, updateScheduleBinCollected, type Schedule, type Bin } from '../services/api';

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
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [allBinsCollected, setAllBinsCollected] = useState<boolean>(false);
  const [activeCollection, setActiveCollection] = useState<boolean>(false);
  
  // Get schedule details
  useEffect(() => {
    const loadScheduleDetails = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const scheduleData = await getScheduleById(scheduleId, token);
        console.log('Schedule data loaded. Status:', scheduleData.status);
        console.log('Bin sequence type:', typeof scheduleData.binSequence[0]);
        
        setSchedule(scheduleData);
        
        // Initialize completed stops if available from the server
        if (scheduleData.completedBins && Array.isArray(scheduleData.completedBins)) {
          setCompletedStops(scheduleData.completedBins);
        }
        
        // Check if the schedule is already in progress and set the active collection state
        if (scheduleData.status === 'in-progress') {
          console.log('Setting active collection state to true');
          setActiveCollection(true);
        }
        
        // Center map on the route
        if (scheduleData && scheduleData.route && scheduleData.route.length > 0) {
          setTimeout(() => {
            fitMapToRoute();
          }, 500);
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
    // Only allow starting if the status is 'scheduled'
    if (schedule.status !== 'scheduled') {
      Alert.alert(
        'Cannot Start Collection',
        'This collection is already in progress or has been completed.'
      );
      return;
    }
    // Immediately switch to in-progress UI and reset stop state
    setActiveCollection(true);
    setCompletedStops([]);
    setAllBinsCollected(false);
    setCurrentStopIndex(0);
    setSelectedBin(null);
    try {
      // Update the server status
      await updateScheduleStatus(schedule._id, 'in-progress', token);
      // Re-fetch the schedule with populated bins so the in-progress UI loads correctly
      const refreshed = await getScheduleById(schedule._id, token);
      setSchedule(refreshed);
      // Set the first stop as selected for the UI
      if (refreshed.binSequence && refreshed.binSequence.length > 0 && typeof refreshed.binSequence[0] !== 'string') {
        setSelectedBin({ ...(refreshed.binSequence[0] as Bin), index: 0 });
      }
    } catch (error) {
      console.error('Error starting collection:', error);
      Alert.alert('Error', 'Failed to start collection. Please try again.');
      return;
    }
    // Focus on the first stop
    focusOnStop(0);
    // Inform user
    Alert.alert(
      'Collection Started',
      'Your collection route has been started. Follow the stops in order to complete your collection.'
    );
  };
  
  // Mark the current bin as collected and advance to next stop
  const markBinCollected = () => {
    if (!schedule) return;
    // update completed stops locally
    const currentBin = schedule.binSequence[currentStopIndex] as Bin;
    if (currentBin) {
      setCompletedStops(prev => [...prev, currentBin._id]);
    }
    setCurrentStopIndex(prevIndex => {
      console.log('markBinCollected: previous index =', prevIndex);
      if (!schedule) {
        console.log('markBinCollected: no schedule loaded');
        return prevIndex;
      }
      const totalBins = schedule.binSequence.length;
      const nextIndex = prevIndex + 1;
      if (nextIndex < totalBins) {
        console.log('Advancing to next stop:', nextIndex);
        setSelectedBin({ ...(schedule.binSequence[nextIndex] as Bin), index: nextIndex });
        focusMapOnActiveSegment(nextIndex);
        return nextIndex;
      } else {
        // All bins collected: focus segment from last bin to end point
        setAllBinsCollected(true);
        // clear selected bin
        setSelectedBin(null);
        // focus map on last-to-end segment
        focusEndSegment(prevIndex);
        return prevIndex;
      }
    });
  };

  // Focus the map on a specific stop
  const focusOnStop = (stopIndex: number) => {
    if (!schedule || !schedule.binSequence || !mapRef.current) return;
    
    const bin = schedule.binSequence[stopIndex];
    if (!bin || typeof bin === 'string') return;
    
    // Set the current stop
    setCurrentStopIndex(stopIndex);
    setSelectedBin({...bin, index: stopIndex});
    
    // Focus map on the appropriate segment
    focusMapOnActiveSegment(stopIndex);
  };
  
  // Focus map on active segment of the route
  const focusMapOnActiveSegment = (stopIndex: number) => {
    if (!schedule || !schedule.route || !schedule.binSequence || !mapRef.current) return;
    
    const bin = schedule.binSequence[stopIndex];
    if (!bin || typeof bin === 'string' || !bin.location || !bin.location.coordinates) return;
    
    // For the first stop, show from depot to first stop
    if (stopIndex === 0 && schedule.areaId && schedule.areaId.startLocation) {
      const startPoint = {
        latitude: schedule.areaId.startLocation.coordinates[1], 
        longitude: schedule.areaId.startLocation.coordinates[0]
      };
      const stopPoint = {
        latitude: bin.location.coordinates[1],
        longitude: bin.location.coordinates[0]
      };
      
      mapRef.current.fitToCoordinates(
        [startPoint, stopPoint],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
      );
      return;
    }
    
    // For stops in the middle, show from previous stop to current stop
    const prevBin = schedule.binSequence[stopIndex - 1];
    if (!prevBin || typeof prevBin === 'string' || !prevBin.location || !prevBin.location.coordinates) return;
    
    const prevPoint = {
      latitude: prevBin.location.coordinates[1],
      longitude: prevBin.location.coordinates[0]
    };
    const currentPoint = {
      latitude: bin.location.coordinates[1],
      longitude: bin.location.coordinates[0]
    };
    
    mapRef.current.fitToCoordinates(
      [prevPoint, currentPoint],
      { edgePadding: { top: 50, right: 50, bottom: 100, left: 50 }, animated: true }
    );
  };
  
  // Focus map on segment from last collected bin to end point
  const focusEndSegment = (lastIndex: number) => {
    if (!schedule?.areaId?.endLocation?.coordinates || !schedule) return;
    const lastBin = schedule.binSequence[lastIndex] as Bin;
    const endCoords = schedule.areaId.endLocation.coordinates;
    mapRef.current?.fitToCoordinates(
      [
        { latitude: lastBin.location.coordinates[1], longitude: lastBin.location.coordinates[0] },
        { latitude: endCoords[1], longitude: endCoords[0] }
      ],
      { edgePadding: { top:50, right:50, bottom:50, left:50 }, animated: true }
    );
  };

  // First, fix the active route segment function
  const getActiveRouteSegment = () => {
    if (!schedule || !schedule.route || !schedule.binSequence) {
      console.log("Missing required data for route segment");
      return schedule?.route?.map(point => ({
        latitude: point[1],
        longitude: point[0]
      })) || [];
    }
    
    console.log(`Getting active route segment for stop ${currentStopIndex + 1}`);
    
    // If this is a new state (has binSequence array but items are strings instead of objects)
    // Just show the entire route since we can't calculate segments
    const isBinPopulated = schedule.binSequence.length > 0 && 
                          typeof schedule.binSequence[0] !== 'string' &&
                          schedule.binSequence[0]?.location;
    
    if (!isBinPopulated) {
      console.log("Bins not populated with location data, showing full route");
      return schedule.route.map(point => ({
        latitude: point[1],
        longitude: point[0]
      }));
    }
    
    // Default: return the entire route for now to ensure something displays
    return schedule.route.map(point => ({
      latitude: point[1],
      longitude: point[0]
    }));
  };

  // Function to check if the current schedule is completed
  const isScheduleCompleted = () => {
    if (!schedule || !schedule.binSequence) return false;
    
    // Check if all bins are collected
    return completedStops.length === schedule.binSequence.length;
  };
  
  // Function to check if a specific bin is already collected
  const isBinCollected = (binId: string) => {
    return completedStops.includes(binId);
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
  
  // Get the polyline coordinates for active route segment
  const getActiveRouteCoordinates = useMemo(() => {
    if (!schedule || !schedule.route || !activeCollection) return [];
    const endCoords = schedule.areaId?.endLocation?.coordinates;
    if (!endCoords) return [];
    // Determine last reference bin: use currentStopIndex (last collected) or first if none collected
    const refIndex = Math.max(0, currentStopIndex);
    const refBin = schedule.binSequence[refIndex] as Bin;
    if (!refBin || !refBin.location?.coordinates) return [];
    // Find closest route point index to the bin
    const binCoord = refBin.location.coordinates;
    let nearestIdx = 0;
    let minDist = Infinity;
    schedule.route.forEach((pt, idx) => {
      const dx = pt[0] - binCoord[0];
      const dy = pt[1] - binCoord[1];
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });
    // Slice from nearest route point to end of route
    const segment = schedule.route.slice(nearestIdx);
    // Map to LatLng
    return segment.map(pt => ({ latitude: pt[1], longitude: pt[0] }));
  }, [schedule, activeCollection, currentStopIndex]);
  
  // Get the remaining route coordinates (shown in lighter color)
  const getRemainingRouteCoordinates = useMemo(() => {
    if (!activeCollection || !schedule || !schedule.route) return [];
    
    // If we're on the last stop, return empty array
    if (currentStopIndex >= (schedule.binSequence?.length || 0) - 1) return [];
    
    // Try to find the current bin in the route
    const currentBin = schedule.binSequence?.[currentStopIndex];
    if (!currentBin || typeof currentBin === 'string' || !currentBin.location) return [];
    
    const currentCoords = [currentBin.location.coordinates[0], currentBin.location.coordinates[1]];
    
    // Find closest point in route to current bin
    let currentPointIndex = -1;
    let minDistance = Infinity;
    
    schedule.route.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(point[0] - currentCoords[0], 2) + 
        Math.pow(point[1] - currentCoords[1], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        currentPointIndex = index;
      }
    });
    
    // Return the remainder of the route
    if (currentPointIndex !== -1 && currentPointIndex < schedule.route.length - 1) {
      return schedule.route.slice(currentPointIndex + 1).map(point => ({
        latitude: point[1],
        longitude: point[0]
      }));
    }
    
    return [];
  }, [schedule, activeCollection, currentStopIndex]);
  
  // Function to get the next stop preview
  const getNextStopPreview = () => {
    if (!schedule || !schedule.binSequence || currentStopIndex >= schedule.binSequence.length - 1) {
      return null;
    }
    
    const nextBin = schedule.binSequence[currentStopIndex + 1];
    if (!nextBin || typeof nextBin === 'string' || !nextBin.location) {
      return null;
    }
    
    return nextBin;
  };
  
  // Return to collector main screen
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Compute precise route segments: past removed, active green, future grey
  const { activeSegmentCoords, futureSegmentCoords } = useMemo(() => {
    if (!schedule || !schedule.route || !schedule.binSequence) {
      return { activeSegmentCoords: [], futureSegmentCoords: [] };
    }
    // Convert full route to LatLng array
    const fullCoords = schedule.route.map(point => ({ latitude: point[1], longitude: point[0] }));
    // Helper to find closest point index
    const findClosestIndex = (coords: [number, number]) => {
      let bestIdx = -1;
      let minDist = Infinity;
      schedule.route.forEach((pt, i) => {
        const d = (pt[0] - coords[0]) ** 2 + (pt[1] - coords[1]) ** 2;
        if (d < minDist) { minDist = d; bestIdx = i; }
      });
      return bestIdx;
    };
    // Current bin
    const currentBin = schedule.binSequence[currentStopIndex];
    if (typeof currentBin === 'string' || !currentBin.location) {
      return { activeSegmentCoords: fullCoords, futureSegmentCoords: [] };
    }
    const currentIdx = findClosestIndex(currentBin.location.coordinates as [number, number]);
    // Previous bin if exists
    let prevIdx = 0;
    if (currentStopIndex > 0) {
      const prevBin = schedule.binSequence[currentStopIndex - 1];
      if (typeof prevBin !== 'string' && prevBin.location) {
        prevIdx = findClosestIndex(prevBin.location.coordinates as [number, number]);
      }
    }
    // Slice segments
    const active = fullCoords.slice(prevIdx, currentIdx + 1);
    const future = fullCoords.slice(currentIdx); // include current bin to next
    return { activeSegmentCoords: active, futureSegmentCoords: future };
  }, [schedule, currentStopIndex]);

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
          {/* Route polyline */}
          {/* Active and future while collecting */}
          {activeCollection && !isScheduleCompleted() && activeSegmentCoords.length > 0 && (
            <Polyline
              coordinates={activeSegmentCoords}
              strokeWidth={5}
              strokeColor="#12805c"
              zIndex={3}
            />
          )}
          {activeCollection && !isScheduleCompleted() && futureSegmentCoords.length > 0 && (
            <Polyline
              coordinates={futureSegmentCoords}
              strokeWidth={4}
              strokeColor="rgba(18,128,92,0.5)"
              zIndex={2}
            />
          )}
          {/* Final segment once all bins collected */}
          {activeCollection && isScheduleCompleted() && futureSegmentCoords.length > 0 && (
            <Polyline
              coordinates={futureSegmentCoords}
              strokeWidth={5}
              strokeColor="#12805c"
              zIndex={3}
            />
          )}
          {/* Full route when not yet started */}
          {!activeCollection && schedule?.route?.length > 0 && (
            <Polyline
              coordinates={schedule.route.map(pt => ({ latitude: pt[1], longitude: pt[0] }))}
              strokeWidth={4}
              strokeColor="#12805c"
              zIndex={1}
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
            
            // Apply different styling based on whether the bin is completed or current
            const isCompleted = isBinCollected(bin._id);
            const isCurrent = activeCollection && index === currentStopIndex;
            
            return (
              <Marker
                key={bin._id || `bin-${index}`}
                coordinate={{
                  latitude: bin.location.coordinates[1],
                  longitude: bin.location.coordinates[0],
                }}
                title={`Bin ${index + 1}${isCompleted ? ' (Collected)' : ''}`}
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
                  
                  // In active collection mode, allow jumping to this stop
                  if (activeCollection) {
                    setCurrentStopIndex(index);
                  }
                }}
              >
                {/* Custom Bin Marker */}
                <View style={styles.binMarkerContainer}>
                  {/* Main Bin Icon - Color based on collection status */}
                  <View style={[
                    styles.binMarker, 
                    { 
                      backgroundColor: isCompleted ? '#9E9E9E' : getBinFillColor(bin.fillLevel || 0),
                      borderColor: isCurrent ? '#FFC107' : '#FFFFFF',
                      borderWidth: isCurrent ? 3 : 2,
                    }
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
      
      {/* Active Collection UI or Regular Stops List */}
      {activeCollection ? (
        <View style={styles.activeCollectionContainer}>
          {/* Progress indicator */}
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>
              {allBinsCollected ?
                `Completed ${completedStops.length} of ${schedule.binSequence.length}` :
                `Completed ${completedStops.length} of ${schedule.binSequence.length}`
              }
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(completedStops.length / (schedule.binSequence.length || 1)) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          {/* Current Stop Card */}
          {allBinsCollected ? (
            <View style={styles.currentStopCard}>
              <Text style={styles.currentStopTitle}>All bins have been collected</Text>
              <Text style={styles.currentStopBinId}>Proceed to end point</Text>
              <TouchableOpacity style={styles.markCollectedButton} onPress={async () => {
                if (!schedule || !token) return;
                try {
                  const updated = await updateScheduleStatus(schedule._id, 'completed', token);
                  setSchedule(updated);
                  setActiveCollection(false);
                } catch (error) {
                  console.error(error);
                  Alert.alert('Error', 'Failed to complete schedule.');
                }
              }}>
                <MaterialCommunityIcons name="flag-checkered" size={24} color="#fff" />
                <Text style={styles.markCollectedButtonText}>Finish Route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.currentStopCard}>
              {(() => {
                const currentBin = schedule.binSequence[currentStopIndex];
                if (!currentBin || typeof currentBin === 'string') return null;
                
                return (
                  <>
                    <View style={styles.currentStopHeader}>
                      <View style={styles.currentStopInfo}>
                        <Text style={styles.currentStopTitle}>Current Stop</Text>
                        <Text style={styles.currentStopBinId}>Bin ID: {currentBin._id}</Text>
                      </View>
                      <View style={[
                        styles.currentStopNumberBadge,
                        { backgroundColor: getBinFillColor(currentBin.fillLevel || 0) }
                      ]}>
                        <Text style={styles.currentStopNumberText}>{currentStopIndex + 1}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.currentStopDetails}>
                      <View style={styles.currentStopDetail}>
                        <Text style={styles.currentStopDetailLabel}>Fill Level:</Text>
                        <View style={styles.fillLevelBarLarge}>
                          <View 
                            style={[
                              styles.fillLevelIndicator, 
                              { 
                                width: `${currentBin.fillLevel || 0}%`,
                                backgroundColor: getBinFillColor(currentBin.fillLevel || 0)
                              }
                            ]} 
                          />
                        </View>
                        <Text style={styles.fillLevelPercentage}>{currentBin.fillLevel || 0}%</Text>
                      </View>
                      
                      <View style={styles.currentStopDetail}>
                        <Text style={styles.currentStopDetailLabel}>Waste Type:</Text>
                        <View style={styles.wasteTypeContainerLarge}>
                          <Text style={styles.wasteTypeLabelLarge}>{currentBin.wasteType || 'General'}</Text>
                        </View>
                      </View>
                      
                      {currentBin.address && (
                        <View style={styles.currentStopDetail}>
                          <Text style={styles.currentStopDetailLabel}>Address:</Text>
                          <Text style={styles.currentStopAddress}>{currentBin.address}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Mark as Collected Button */}
                    <TouchableOpacity 
                      style={styles.markCollectedButton}
                      onPress={markBinCollected}
                    >
                      <MaterialCommunityIcons name="check" size={24} color="#ffffff" />
                      <Text style={styles.markCollectedButtonText}>Mark as Collected</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          )}
        </View>
      ) : (
        /* Regular Stops List - Bottom section when not in active collection */
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
                      <Text style={styles.stopBinId}>Bin ID: {bin._id}</Text>
                      {bin.wasteType && (
                      <View style={styles.wasteTypeContainer}>
                        <Text style={styles.wasteTypeLabel}>{bin.wasteType}</Text>
                      </View>
                      )}
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
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
      
      {/* Start Collection Button (FAB) - Only shown when not in active collection */}
      {schedule.status === 'scheduled' && !activeCollection && (
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
    backgroundColor: '#fff',
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
    height: '52%', // Take up 60% of the screen height
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
    height: '48%', // Take up 40% of screen height
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,

    paddingBottom: 90, // Overlap the map slightly
  },
  // Active Collection UI Styles
  activeCollectionContainer: {
    height: '48%',
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  progressIndicator: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#12805c',
    borderRadius: 4,
  },
  currentStopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currentStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentStopInfo: {
    flex: 1,
  },
  currentStopTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentStopBinId: {
    fontSize: 14,
    color: '#666',
  },
  currentStopNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12805c',
  },
  currentStopNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  currentStopDetails: {
    marginBottom: 16,
  },
  currentStopDetail: {
    marginBottom: 10,
  },
  currentStopDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  fillLevelBarLarge: {
    height: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 6,
  },
  wasteTypeContainerLarge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  wasteTypeLabelLarge: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  currentStopAddress: {
    fontSize: 14,
    color: '#666',
  },
  markCollectedButton: {
    backgroundColor: '#12805c',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  markCollectedButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
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
    elevation: 1,
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
    left: 16,
    right: 16,  
    backgroundColor: '#12805c',
    borderRadius: 12,
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