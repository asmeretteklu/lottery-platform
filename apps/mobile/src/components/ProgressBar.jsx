import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ProgressBar({ current, max }) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <View style={styles.container}>
      <View style={[styles.filler, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  filler: {
    height: '100%',
    backgroundColor: '#eab308',
  }
});
