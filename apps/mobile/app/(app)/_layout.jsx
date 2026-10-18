import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, router } from 'expo-router';
import { getToken } from '../../src/utils/auth';

export default function AppLayout() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await getToken();
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      // Let the mount finish before replacing to avoid layout errors
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 0);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#eab308" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  return (
    <Tabs 
      screenOptions={{ 
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#eab308',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#eab308',
        tabBarInactiveTintColor: '#94a3b8'
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Lotteries',
          tabBarLabel: 'Home'
        }} 
      />
      <Tabs.Screen 
        name="my-tickets" 
        options={{ 
          title: 'My Tickets',
          tabBarLabel: 'Tickets'
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarLabel: 'Profile'
        }} 
      />
      {/* Hide nested screens from tabs */}
      <Tabs.Screen name="lottery/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="lottery/[id]/buy" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="draw-live/[id]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
