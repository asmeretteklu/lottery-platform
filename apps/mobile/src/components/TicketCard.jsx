import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function TicketCard({ ticket }) {
  const isWinner = ticket.status === 'winner';
  const isLoser = ticket.status === 'no_win';

  let statusText = 'Active';
  let statusColor = '#3b82f6'; // blue
  
  if (isWinner) {
    statusText = 'Winner 🎉';
    statusColor = '#22c55e'; // green
  } else if (isLoser) {
    statusText = 'Not a winner';
    statusColor = '#64748b'; // gray
  } else if (ticket.lotteries?.status === 'completed') {
    statusText = 'Draw Completed';
    statusColor = '#64748b';
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {ticket.lotteries?.title || 'Unknown Lottery'}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
      </View>
      
      <View style={styles.body}>
        <View style={styles.qrContainer}>
          <QRCode
            value={ticket.qr_hash || 'error'}
            size={120}
            color="black"
            backgroundColor="white"
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.label}>Ticket Number</Text>
          <Text style={styles.value}>#{ticket.ticket_number}</Text>
          <Text style={styles.dateLabel}>Purchased on</Text>
          <Text style={styles.dateValue}>
            {new Date(ticket.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
  },
  value: {
    color: '#eab308',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  dateValue: {
    color: '#f8fafc',
    fontSize: 14,
  }
});
