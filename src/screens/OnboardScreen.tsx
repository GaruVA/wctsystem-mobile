import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types'; // Adjust the import path as necessary

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

type Props = {
  navigation: OnboardingScreenNavigationProp;
};

const OnboardingScreen = ({ navigation }: Props) => {
  const handleFinishOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    navigation.replace('MapScreen');
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/onboarding.png')} style={styles.image} />
      <Text style={styles.title}>Welcome to SmartBin</Text>
      <Text style={styles.description}>View nearby bins, check fill levels, and report issues.</Text>
      <Button title="Get Started" onPress={handleFinishOnboarding} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  image: { width: 200, height: 200, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
});

export default OnboardingScreen;