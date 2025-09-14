import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/DashboardScreen';
import PersonDetailScreen from '../screens/PersonDetailScreen';
import BackupScreen from '../screens/BackupScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
        <Stack.Screen name="Backup" component={BackupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
