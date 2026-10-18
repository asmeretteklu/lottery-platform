import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CountdownTimer({ drawAt }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0, expired: false
  });

  useEffect(() => {
    if (!drawAt) return;
    
    const target = new Date(drawAt).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
        expired: false
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [drawAt]);

  if (timeLeft.expired) {
    return <Text style={[styles.timerText, { color: '#ef4444' }]}>Draw is Live!</Text>;
  }

  const pad = (n) => (n < 10 ? '0' + n : n);

  return (
    <View style={styles.container}>
      {timeLeft.days > 0 && <Text style={styles.timerText}>{timeLeft.days}d </Text>}
      <Text style={styles.timerText}>
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  timerText: {
    color: '#eab308',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
