import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GuidelineScreen from '../screens/GuidelineScreen';
import MapScreen from '../screens/MapScreen';
import SuggestBinScreen from '../screens/SuggestBinScreen'; // Import the new screen

// Define the RootStackParamList type for TypeScript navigation typing
export type RootStackParamList = {
  Guideline: undefined;
  Map: undefined;
  SuggestBinScreen: undefined; // Add the new screen to the stack
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Guideline"
        screenOptions={{
          headerShown: false,  // Hide headers for all screens
        }}
      >
        <Stack.Screen name="Guideline" component={GuidelineScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="SuggestBinScreen" component={SuggestBinScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
