import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GuidelineScreen from '../screens/GuidelineScreen';
import MapScreen from '../screens/MapScreen';
import CollectorLoginScreen from '../screens/CollectorLoginScreen';
import CollectorMainScreen from '../screens/CollectorMainScreen';
import CollectorRouteScreen from '../screens/CollectorRouteScreen';
import { CollectorAuthProvider } from '../context/CollectorAuthContext';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <CollectorAuthProvider>
        <Stack.Navigator 
          initialRouteName="Guideline"
          screenOptions={{
            headerShown: false,  // Hide headers for all screens
          }}
        >
          <Stack.Screen name="Guideline" component={GuidelineScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="CollectorLogin" component={CollectorLoginScreen} />
          <Stack.Screen name="CollectorMain" component={CollectorMainScreen} />
          <Stack.Screen name="CollectorRoute" component={CollectorRouteScreen} />
        </Stack.Navigator>
      </CollectorAuthProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
