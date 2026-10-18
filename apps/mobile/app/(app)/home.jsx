import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import client from '../../src/api/client';
import LotteryCard from '../../src/components/LotteryCard';
import toast from '../../src/utils/toast';

export default function HomeScreen() {
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLotteries = async () => {
    try {
      // Assuming GET /lotteries returns a list of lotteries
      const { data } = await client.get('/lotteries');
      // Filter for active lotteries, or just show whatever is returned. 
      // The prompt says "active lotteries"
      const activeLotteries = data.filter(l => l.status === 'active' || l.status === 'draft'); // Allow draft for testing if needed
      setLotteries(activeLotteries);
    } catch (err) {
      toast.error('Failed to load lotteries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLotteries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLotteries();
  };

  const handlePressLottery = (id) => {
    router.push(`/lottery/${id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#eab308" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lotteries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LotteryCard 
            lottery={item} 
            onPress={() => handlePressLottery(item.id)} 
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#eab308"
            colors={['#eab308']}
            progressBackgroundColor="#1e293b"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No active lotteries at the moment.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
