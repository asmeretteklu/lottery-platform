import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import client from '../../../src/api/client';
import CountdownTimer from '../../../src/components/CountdownTimer';
import ProgressBar from '../../../src/components/ProgressBar';
import toast from '../../../src/utils/toast';

export default function LotteryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [lottery, setLottery] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [lotteryRes, ticketsRes] = await Promise.all([
        client.get(`/lotteries/${id}`),
        client.get('/tickets/my')
      ]);
      setLottery(lotteryRes.data);
      // Filter my tickets to just this lottery
      const myTix = ticketsRes.data.filter(t => t.lottery_id === id);
      setMyTickets(myTix);
    } catch (err) {
      toast.error('Failed to load lottery details');
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

  if (!lottery) return null;

  const ticketsSold = lottery.tickets_sold || 0;
  const maxTickets = lottery.max_tickets || 100;
  const remaining = maxTickets - ticketsSold;
  
  const canBuy = myTickets.length < 3 && remaining > 0 && (lottery.status === 'active' || lottery.status === 'draft');

  const getRankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `🏆 #${rank}`;
  };

  const handleBuyTicket = () => {
    router.push(`/lottery/${id}/buy`);
  };

  const handleLiveDraw = () => {
    router.push(`/draw-live/${id}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{lottery.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{lottery.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Tickets Sold: <Text style={styles.statsValue}>{ticketsSold} / {maxTickets}</Text></Text>
            <Text style={styles.statsLabel}>Price: <Text style={styles.priceValue}>{lottery.ticket_price} ETB</Text></Text>
          </View>
          <ProgressBar current={ticketsSold} max={maxTickets} />
          <View style={styles.timerRow}>
            <Text style={styles.statsLabel}>Draw in:</Text>
            <CountdownTimer drawAt={lottery.draw_at} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Prizes</Text>
        {lottery.prizes?.map((prize) => (
          <View key={prize.id} style={styles.prizeCard}>
            {prize.photo_url ? (
              <Image source={{ uri: prize.photo_url }} style={styles.prizeImage} />
            ) : (
              <View style={styles.prizePlaceholder} />
            )}
            <View style={styles.prizeInfo}>
              <Text style={styles.prizeTitle}>
                {getRankMedal(prize.prize_rank)} {prize.title}
              </Text>
              <Text style={styles.prizeValue}>Value: {prize.value_etb} ETB</Text>
              {prize.description && <Text style={styles.prizeDesc}>{prize.description}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.myTicketsText}>You own {myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''} (Max 3)</Text>
        
        {lottery.status === 'active' || lottery.status === 'draft' ? (
          <TouchableOpacity 
            style={[styles.buyButton, !canBuy && styles.buyButtonDisabled]} 
            onPress={handleBuyTicket}
            disabled={!canBuy}
          >
            <Text style={styles.buyButtonText}>
              {!canBuy ? (myTickets.length >= 3 ? 'Maximum tickets reached' : 'Sold Out') : 'Buy Ticket'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.liveButton} onPress={handleLiveDraw}>
            <Text style={styles.liveButtonText}>Watch Live Draw</Text>
          </TouchableOpacity>
        )}
      </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  statsValue: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  priceValue: {
    color: '#eab308',
    fontWeight: 'bold',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  prizeCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  prizeImage: {
    width: 100,
    height: 100,
    backgroundColor: '#0f172a',
  },
  prizePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#334155',
  },
  prizeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  prizeValue: {
    fontSize: 14,
    color: '#eab308',
    marginBottom: 4,
  },
  prizeDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footer: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  myTicketsText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#eab308',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: '#475569',
  },
  buyButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  liveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
