import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/services/DatabaseService';

export default function App() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('Initializing database on app start...');
        await DatabaseService.init();
        console.log('Database initialized successfully');
        setIsDatabaseReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Still set ready to true to prevent infinite loading
        setIsDatabaseReady(true);
      }
    };

    initializeDatabase();
  }, []);

  if (!isDatabaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style="dark" backgroundColor="#ffffff" />
    </>
  );
}
