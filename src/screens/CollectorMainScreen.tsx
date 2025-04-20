import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCollectorAuth } from '../context/CollectorAuthContext';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { getCollectorArea, getCollectorSchedules, type AreaData, type Schedule } from '../services/api';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

// Add custom functions for date checks that aren't available in date-fns v4
const parseISO = (dateString: string): Date => {
  return new Date(dateString);
};

// Custom isWithinInterval implementation
const isWithinRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

type CollectorMainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CollectorMain'>;

interface SchedulesByDate {
  title: string;
  data: Schedule[];
}

const CollectorMainScreen = () => {
  const [loading, setLoading] = useState(true);
  const [areaLoading, setAreaLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token, signOut } = useCollectorAuth();
  const navigation = useNavigation<CollectorMainScreenNavigationProp>();
  
  // State for area and schedules
  const [area, setArea] = useState<AreaData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Function to load area data
  const loadAreaData = useCallback(async () => {
    if (!token) return;
    
    try {
      setAreaLoading(true);
      const areaData = await getCollectorArea(token);
      setArea(areaData);
    } catch (error) {
      console.error('Error loading area data:', error);
      Alert.alert('Error', 'Failed to load area information. Please try again.');
    } finally {
      setAreaLoading(false);
    }
  }, [token]);

  // Function to load schedules
  const loadSchedules = useCallback(async () => {
    if (!token) return;
    
    try {
      setSchedulesLoading(true);
      
      // Get schedules for the next 2 weeks
      const today = new Date();
      const twoWeeksLater = addDays(today, 14);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = twoWeeksLater.toISOString().split('T')[0];
      
      const response = await getCollectorSchedules(token, {
        fromDate,
        toDate,
        limit: 50,
      });
      
      setSchedules(response.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Error', 'Failed to load schedules. Please try again.');
    } finally {
      setSchedulesLoading(false);
    }
  }, [token]);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([loadAreaData(), loadSchedules()]);
      setLoading(false);
    };
    
    fetchData();
  }, [loadAreaData, loadSchedules]);

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAreaData(), loadSchedules()]);
    setRefreshing(false);
  }, [loadAreaData, loadSchedules]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate('Map');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle schedule selection
  const handleScheduleSelect = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    
    // Navigate to the route screen with the selected schedule
    navigation.navigate('CollectorRoute', { scheduleId: schedule._id });
  };

  // Group schedules by date category
  const groupedSchedules = useMemo(() => {
    const result: SchedulesByDate[] = [
      { title: 'Today', data: [] },
      { title: 'Tomorrow', data: [] },
      { title: 'This Week', data: [] },
      { title: 'Later', data: [] }
    ];
    
    if (!schedules.length) return result;
    
    const today = new Date();
    const thisWeekEnd = addDays(today, 6); // 7 days including today
    
    schedules.forEach(schedule => {
      const scheduleDate = parseISO(schedule.date);
      
      if (isToday(scheduleDate)) {
        result[0].data.push(schedule);
      } else if (isTomorrow(scheduleDate)) {
        result[1].data.push(schedule);
      } else if (isWithinRange(scheduleDate, today, thisWeekEnd)) {
        result[2].data.push(schedule);
      } else {
        result[3].data.push(schedule);
      }
    });
    
    // Return only sections that have data
    return result.filter(section => section.data.length > 0);
  }, [schedules]);

  // Get the bin count by waste type
  const binsByWasteType = useMemo(() => {
    if (!area?.bins) return { total: 0, types: {} };
    
    console.log('Processing bins for waste types');
    console.log(`Total bins in area: ${area.bins.length}`);
    
    const types: Record<string, number> = {};
    area.bins.forEach(bin => {
      if (bin.wasteType && typeof bin.wasteType === 'string') {
        // Handle wasteType as a single string value
        const wasteType = bin.wasteType.trim();
        types[wasteType] = (types[wasteType] || 0) + 1;
      } else {
        types['General'] = (types['General'] || 0) + 1;
      }
    });
    
    console.log('Final waste types count:', types);
    
    return {
      total: area.bins.length,
      types
    };
  }, [area]);

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#12805c" />
        <Text style={styles.loadingText}>Loading your collection data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collection Dashboard</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#12805c" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Area Overview Card */}
        <View style={styles.areaCard}>
          {areaLoading ? (
            <ActivityIndicator size="small" color="#12805c" />
          ) : area ? (
            <>
              <View style={styles.areaHeader}>
                <View>
                  <Text style={styles.areaTitle}>Assigned Area</Text>
                  <Text style={styles.areaName}>{area.areaName}</Text>
                </View>
                <View style={styles.binCountBadge}>
                  <Text style={styles.binCountText}>{binsByWasteType.total}</Text>
                  <Text style={styles.binCountLabel}>Bins</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.wasteTypeContainer}>
                <Text style={styles.wasteTypeTitle}>Waste Types:</Text>
                <View style={styles.wasteTypeTags}>
                  {Object.entries(binsByWasteType.types).map(([type, count], index) => (
                    <View 
                      key={index} 
                      style={[styles.wasteTypeTag, { backgroundColor: getWasteTypeColor(type) }]}
                    >
                      <Text style={styles.wasteTypeText}>
                        {type}: {count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>No area assigned</Text>
          )}
        </View>

        {/* Schedules Section */}
        <View style={styles.schedulesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Collection Schedules</Text>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => Alert.alert("Calendar View", "Calendar view will be implemented in the future.")}
            >
              <MaterialCommunityIcons name="calendar" size={20} color="#12805c" />
              <Text style={styles.calendarButtonText}>Calendar</Text>
            </TouchableOpacity>
          </View>

          {schedulesLoading ? (
            <ActivityIndicator size="small" color="#12805c" style={styles.schedulesLoader} />
          ) : schedules.length > 0 ? (
            <>
              {groupedSchedules.map((section, sectionIndex) => (
                <View key={section.title} style={styles.scheduleSection}>
                  <Text style={styles.scheduleSectionTitle}>{section.title}</Text>
                  {section.data.map((schedule, index) => (
                    <TouchableOpacity
                      key={schedule._id}
                      style={styles.scheduleCard}
                      onPress={() => handleScheduleSelect(schedule)}
                    >
                      <View style={styles.scheduleHeader}>
                        <View style={styles.scheduleDate}>
                          <Text style={styles.scheduleDateDay}>
                            {format(parseISO(schedule.date), 'd')}
                          </Text>
                          <Text style={styles.scheduleDateMonth}>
                            {format(parseISO(schedule.date), 'MMM')}
                          </Text>
                        </View>
                        <View style={styles.scheduleDetails}>
                          <Text style={styles.scheduleName}>{schedule.name}</Text>
                          <Text style={styles.scheduleTime}>
                            {schedule.startTime ? format(parseISO(schedule.startTime), 'h:mm a') : 'No start time'} 
                            {schedule.endTime ? ` - ${format(parseISO(schedule.endTime), 'h:mm a')}` : ''}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, getStatusStyle(schedule.status)]}>
                          <Text style={styles.statusText}>{schedule.status}</Text>
                        </View>
                      </View>
                      <View style={styles.scheduleFooter}>
                        <View style={styles.scheduleStats}>
                          <View style={styles.statItem}>
                            <FontAwesome5 name="trash-alt" size={14} color="#666" />
                            <Text style={styles.statText}>{schedule.binSequence.length} bins</Text>
                          </View>
                          <View style={styles.statItem}>
                            <FontAwesome5 name="road" size={14} color="#666" />
                            <Text style={styles.statText}>{schedule.distance.toFixed(1)} km</Text>
                          </View>
                          <View style={styles.statItem}>
                            <FontAwesome5 name="clock" size={14} color="#666" />
                            <Text style={styles.statText}>{Math.round(schedule.duration)} min</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleScheduleSelect(schedule)}
                        >
                          <Text style={styles.actionButtonText}>
                            {schedule.status === 'scheduled' ? 'View Route' : 
                             schedule.status === 'in-progress' ? 'Continue' : 
                             'Details'}
                          </Text>
                          <MaterialCommunityIcons name="chevron-right" size={18} color="#12805c" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.noSchedulesContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#ccc" />
              <Text style={styles.noSchedulesText}>No upcoming schedules</Text>
              <Text style={styles.noSchedulesSubtext}>
                Your collection schedules will appear here when assigned.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Helper function for getting waste type color
const getWasteTypeColor = (type: string): string => {
  type = type.toLowerCase();
  switch (type) {
    case 'plastic':
      return '#E1F5FE';
    case 'paper':
      return '#E8F5E9';
    case 'glass':
      return '#F3E5F5';
    case 'metal':
      return '#EEEEEE';
    case 'organic':
      return '#F1F8E9';
    case 'general':
    default:
      return '#ECEFF1';
  }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    padding: 8,
  },
  // Area card styles
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  areaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  binCountBadge: {
    backgroundColor: '#12805c',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  binCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  binCountLabel: {
    color: '#fff',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  wasteTypeContainer: {
    marginTop: 4,
  },
  wasteTypeTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  wasteTypeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  wasteTypeTag: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  wasteTypeText: {
    fontSize: 12,
    color: '#333',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 16,
  },
  // Schedules section
  schedulesContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#12805c',
    marginLeft: 4,
  },
  schedulesLoader: {
    marginVertical: 20,
  },
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleDate: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    alignItems: 'center',
    padding: 8,
    minWidth: 44,
  },
  scheduleDateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#12805c',
  },
  scheduleDateMonth: {
    fontSize: 12,
    color: '#12805c',
  },
  scheduleDetails: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusScheduled: {
    backgroundColor: '#f0f9ff',
  },
  statusInProgress: {
    backgroundColor: '#FFF9C4',
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
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#12805c',
    fontWeight: '500',
    marginRight: 2,
  },
  noSchedulesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 10,
  },
  noSchedulesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
  },
  noSchedulesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default CollectorMainScreen;