import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { getScheduleById, type Schedule } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { useCollectorAuth } from '../context/CollectorAuthContext';

type RouteSummaryNavigationProp = StackNavigationProp<RootStackParamList, 'RouteSummary'>;
type RouteSummaryRouteProp = RouteProp<RootStackParamList, 'RouteSummary'>;

const RouteSummaryScreen = () => {
  const navigation = useNavigation<RouteSummaryNavigationProp>();
  const route = useRoute<RouteSummaryRouteProp>();
  const { scheduleId } = route.params;
  const { token } = useCollectorAuth();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Schedule | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Handle the case where token might be null
        if (!token) {
          console.error("No authentication token available");
          return;
        }
        const data = await getScheduleById(scheduleId, token);
        setSummary(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scheduleId, token]);

  if (loading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#12805c" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  const { binSequence, distance, duration, actualStartTime, actualEndTime } = summary;
  const collected = Array.isArray(binSequence) ? binSequence.length : 0;
  const expectedMins = duration; // assume duration in minutes
  const start = actualStartTime ? new Date(actualStartTime as string) : undefined;
  const end = actualEndTime ? new Date(actualEndTime as string) : undefined;
  const actualMins = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const efficiency = expectedMins && actualMins ? Math.round((expectedMins / actualMins) * 100) : 0;
  
  // Determine efficiency color based on percentage
  const getEfficiencyColor = () => {
    if (efficiency >= 100) return '#12805c'; // Green for excellent efficiency
    if (efficiency >= 80) return '#ffa500';  // Orange for good efficiency
    return '#e74c3c';                        // Red for poor efficiency
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Route Summary</Text>
      
      {/* Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Collection Stats</Text>
        </View>
        <View style={styles.row}><Text style={styles.label}>Bins Collected:</Text><Text style={styles.value}>{collected}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Distance:</Text><Text style={styles.value}>{distance.toFixed(1)} km</Text></View>

        <View style={styles.row}><Text style={styles.label}>Duration:</Text><Text style={styles.value}>{actualMins} min</Text></View>
        <View style={styles.row}><Text style={styles.label}>Start Time:</Text><Text style={styles.value}>{start ? format(start, 'h:mm a') : '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>End Time:</Text><Text style={styles.value}>{end ? format(end, 'h:mm a') : '-'}</Text></View>
      </View>
      
      {/* Efficiency Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Performance</Text>
        </View>
        <View style={styles.efficiencyContainer}>
          <Text style={styles.efficiencyLabel}>Efficiency</Text>
          <View style={styles.efficiencyValueContainer}>
            <Text style={[styles.efficiencyValue, { color: getEfficiencyColor() }]}>{efficiency}%</Text>
          </View>
          <View style={styles.efficiencyBar}>
            <View 
              style={[
                styles.efficiencyFill, 
                { 
                  width: `${Math.min(efficiency, 100)}%`,
                  backgroundColor: getEfficiencyColor()
                }
              ]} 
            />
          </View>
          <Text style={styles.efficiencyExplanation}>
            {efficiency >= 100 
              ? 'Excellent! Route completed faster than expected.'
              : efficiency >= 80 
                ? 'Good efficiency. Route completed close to schedule.'
                : 'Below target efficiency. Consider optimizing the route.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CollectorMain')}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#12805c',
    textAlign: 'center',
    marginTop: 10
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#12805c'
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderColor: '#f0f0f0' 
  },
  label: { 
    fontSize: 16, 
    color: '#555' 
  },
  value: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333' 
  },
  efficiencyContainer: {
    alignItems: 'center',
    padding: 8
  },
  efficiencyLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8
  },
  efficiencyValueContainer: {
    marginBottom: 8
  },
  efficiencyValue: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  efficiencyBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 5,
    marginBottom: 12
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 5
  },
  efficiencyExplanation: {
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic'
  },
  button: { 
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,  
    backgroundColor: '#12805c',
    borderRadius: 12,
    paddingVertical: 16,
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
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#12805c' },
});

export default RouteSummaryScreen;