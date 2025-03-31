import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Define the navigation params type
type RootStackParamList = {
  Guideline: undefined;
  Map: undefined;
};

// Create a typed navigation hook
type GuidelineScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Guideline'>;

const GuidelineScreen = () => {
  const navigation = useNavigation<GuidelineScreenNavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('Map');
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/splash-icon.png')} 
        style={styles.logo} 
      />
      
      <Text style={styles.title}>Welcome to WCTSystem</Text>
      
      <Text style={styles.subtitle}>Smart Waste Management for Residents</Text>
      
      <View style={styles.guidelinesContainer}>
        <Text style={styles.guidelineTitle}>How to use the app:</Text>
        
        <View style={styles.guidelineItem}>
          <Text style={styles.guidelineNumber}>1</Text>
          <Text style={styles.guidelineText}>
            View nearby smart waste bins on the map with real-time fill levels
          </Text>
        </View>
        
        <View style={styles.guidelineItem}>
          <Text style={styles.guidelineNumber}>2</Text>
          <Text style={styles.guidelineText}>
            Tap on a bin to see detailed information including fill percentage
          </Text>
        </View>
        
        <View style={styles.guidelineItem}>
          <Text style={styles.guidelineNumber}>3</Text>
          <Text style={styles.guidelineText}>
            Different colors indicate the bin's fill level: green (low), yellow (medium), orange (high), red (full)
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleGetStarted}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#12805c',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#555',
    textAlign: 'center',
  },
  guidelinesContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guidelineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  guidelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  guidelineNumber: {
    backgroundColor: '#12805c',
    color: 'white',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    textAlign: 'center',
    lineHeight: 25,
    marginRight: 10,
    fontWeight: 'bold',
  },
  guidelineText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#12805c',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GuidelineScreen;
