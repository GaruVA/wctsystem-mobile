import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCollectorAuth } from '../context/CollectorAuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';

type CollectorMainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CollectorMain'>;

const CollectorMainScreen = () => {
  const [loading, setLoading] = useState(false);
  const { token, signOut } = useCollectorAuth();
  const navigation = useNavigation<CollectorMainScreenNavigationProp>();
  
  // Placeholder for collector data
  const [collectorData, setCollectorData] = useState({
    name: 'Driver',
    assignedArea: 'Loading...',
    binCount: 0,
  });

  useEffect(() => {
    // Here we would fetch the collector data using the token
    const loadCollectorData = async () => {
      setLoading(true);
      try {
        // This would be replaced with actual API call
        // Example: const data = await getCollectorArea(token);
        
        // Simulating API response
        setTimeout(() => {
          setCollectorData({
            name: 'John Doe',
            assignedArea: 'Downtown',
            binCount: 12,
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading collector data:', error);
        Alert.alert('Error', 'Failed to load your collection route. Please try again.');
        setLoading(false);
      }
    };
    
    loadCollectorData();
  }, [token]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate('Map');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleStartCollection = () => {
    Alert.alert('Start Collection', 'This will redirect to the full collector app functionality.');
    // Here we would navigate to the collector app's main screen
    // This is a placeholder for future implementation
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#12805c" />
        <Text style={styles.loadingText}>Loading your route information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#12805c" />
        </TouchableOpacity>
        <Text style={styles.title}>Driver Dashboard</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.welcomeText}>Welcome, {collectorData.name}</Text>
        <Text style={styles.areaText}>Assigned Area: {collectorData.assignedArea}</Text>
        <Text style={styles.binCountText}>Bins to collect: {collectorData.binCount}</Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStartCollection}>
        <Text style={styles.startButtonText}>Start Collection Route</Text>
        <MaterialCommunityIcons name="truck" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.notesContainer}>
        <Text style={styles.notesTitle}>Notes:</Text>
        <Text style={styles.noteText}>• Collector functionality will be fully integrated in future updates</Text>
        <Text style={styles.noteText}>• This is a placeholder screen to demonstrate navigation flow</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#12805c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  backButton: {
    padding: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#12805c',
    textAlign: 'center',
    marginRight: 44, // To center the text with the back button on left
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  areaText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  binCountText: {
    fontSize: 16,
    color: '#555',
  },
  startButton: {
    backgroundColor: '#12805c',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  notesContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#12805c',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
});

export default CollectorMainScreen;