import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/context/theme';

export default function AuthCallbackScreen() {
  const { colors: C } = useAppTheme();
  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <ActivityIndicator size="large" color={C.red} />
      <Text style={[styles.text, { color: C.text }]}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  text: { fontSize: 15 },
});

