import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import client from '../../../../src/api/client';
import TicketCard from '../../../../src/components/TicketCard';
import toast from '../../../../src/utils/toast';

export default function BuyTicketScreen() {
  const { id } = useLocalSearchParams();
  const [lottery, setLottery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [ticket, setTicket] = useState(null); // Will hold the created ticket

  useEffect(() => {
    fetchLottery();
  }, [id]);

  const fetchLottery = async () => {
    try {
      const { data } = await client.get(`/lotteries/${id}`);
      setLottery(data);
    } catch (err) {
      toast.error('Failed to load lottery');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    setPurchasing(true);
    try {
      const { data } = await client.post('/tickets/purchase', { lottery_id: id });
      
      // Merge lottery info so TicketCard can render the title correctly
      const purchasedTicket = {
        ...data,
        lotteries: {
          title: lottery.title
        }
      };
      
      setTicket(purchasedTicket);
      toast.success('Ticket purchased successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to purchase ticket');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#eab308" />
      </View>
    );
  }

  // Success state
  if (ticket) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Purchase Successful!</Text>
          <Text style={styles.successSubtitle}>Here is your ticket. Good luck!</Text>
          
          <TicketCard ticket={ticket} />
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.replace('/(app)/my-tickets')}
          >
            <Text style={styles.buttonText}>Save to My Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Confirmation state
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Confirm Purchase</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Lottery</Text>
          <Text style={styles.value}>{lottery?.title}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.row}>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.price}>{lottery?.ticket_price} ETB</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            By confirming, {lottery?.ticket_price} ETB will be deducted from your account. You can purchase up to 3 tickets per lottery.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => router.back()}
            disabled={purchasing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.confirmButton, purchasing && styles.disabledButton]} 
            onPress={handleConfirmPurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 32,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
  },
  value: {
    fontSize: 18,
    color: '#f8fafc',
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    color: '#eab308',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 16,
    marginBottom: 32,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#eab308',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#eab308',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
