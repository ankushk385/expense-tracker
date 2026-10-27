import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import C from '@/constants/colors';

export default function AuthCallbackScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={C.red} />
      <Text style={styles.text}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: C.black },
  text: { color: C.offWhite, fontSize: 15 },
});

