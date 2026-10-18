import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import client from '../../../src/api/client';
import TicketCard from '../../../src/components/TicketCard';
import toast from '../../../src/utils/toast';

// Direct Supabase client for real-time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LiveDrawScreen() {
  const { id } = useLocalSearchParams();
  const [lottery, setLottery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState([]);
  const [drawStatus, setDrawStatus] = useState('waiting'); // 'waiting' | 'drawing' | 'completed'

  useEffect(() => {
    fetchLottery();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    // Subscribe to changes on tickets table for this lottery
    const subscription = supabase
      .channel(`public:tickets:lottery_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `lottery_id=eq.${id}` },
        (payload) => {
          if (payload.new.status === 'winner') {
            setWinners((prev) => {
              // Prevent duplicates
              if (prev.find(w => w.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        }
      )
      .subscribe();

    // Subscribe to lottery table changes for status updates
    const lotterySubscription = supabase
      .channel(`public:lotteries:id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lotteries', filter: `id=eq.${id}` },
        (payload) => {
          setLottery((prev) => ({ ...prev, ...payload.new }));
          if (payload.new.status === 'completed') {
            setDrawStatus('completed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(lotterySubscription);
    };
  }, [id]);

  const fetchLottery = async () => {
    try {
      const { data } = await client.get(`/lotteries/${id}`);
      setLottery(data);
      if (data.status === 'completed') {
        setDrawStatus('completed');
        // If it's already completed, fetch winners directly
        const winnersRes = await client.get(`/lotteries/${id}/winners`);
        setWinners(winnersRes.data);
      } else if (new Date(data.draw_at) <= new Date()) {
        setDrawStatus('drawing');
      }
    } catch (err) {
      toast.error('Failed to load draw info');
      router.back();
    } finally {
      setLoading(false);
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>{lottery?.title} - LIVE DRAW</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {drawStatus === 'waiting' ? 'WAITING TO START' : 
             drawStatus === 'drawing' ? 'DRAWING NOW...' : 'COMPLETED'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {drawStatus === 'drawing' && (
          <View style={styles.drawingAnimation}>
            <ActivityIndicator size="large" color="#eab308" />
            <Text style={styles.drawingText}>Selecting winners randomly...</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Winners ({winners.length})</Text>
        
        {winners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No winners announced yet</Text>
          </View>
        ) : (
          winners.map((winner, index) => (
            <View key={winner.id} style={styles.winnerCard}>
              <View style={styles.winnerHeader}>
                <Text style={styles.winnerRank}>🎉 Winner #{index + 1}</Text>
                <Text style={styles.winnerTicket}>Ticket: {winner.ticket_number}</Text>
              </View>
              {winner.user_id && <Text style={styles.winnerUser}>Player ID: {winner.user_id}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
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
  header: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
    paddingTop: 60, // For safe area loosely
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  drawingAnimation: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eab308',
    alignItems: 'center',
    marginBottom: 24,
  },
  drawingText: {
    color: '#eab308',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  winnerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
    marginBottom: 12,
  },
  winnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  winnerRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  winnerTicket: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  winnerUser: {
    color: '#94a3b8',
    fontSize: 14,
  },
  closeButton: {
    margin: 16,
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
