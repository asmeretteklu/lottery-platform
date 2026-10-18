import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import ProgressBar from './ProgressBar';
import CountdownTimer from './CountdownTimer';

export default function LotteryCard({ lottery, onPress }) {
  const ticketsSold = lottery.tickets_sold || 0;
  const maxTickets = lottery.max_tickets || 100;
  const remaining = maxTickets - ticketsSold;
  
  // Try to extract the first prize photo
  const firstPrize = lottery.prizes?.length > 0 ? lottery.prizes[0] : null;
  const photoUrl = firstPrize?.photo_url || null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>🎟️</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{lottery.title}</Text>
        <Text style={styles.price}>{lottery.ticket_price} ETB</Text>
        
        <View style={styles.progressContainer}>
          <ProgressBar current={ticketsSold} max={maxTickets} />
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{remaining} tickets left</Text>
            <CountdownTimer drawAt={lottery.draw_at} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#0f172a',
  },
  placeholderImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eab308',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statsText: {
    color: '#94a3b8',
    fontSize: 12,
  }
});
