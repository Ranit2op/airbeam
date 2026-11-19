import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { colors } from '../theme/colors';

export function HomeScreen({ onSendPress, onReceivePress }) {
  const [localIp, setLocalIp] = useState('Checking Wi-Fi...');

  useEffect(() => {
    Network.getIpAddressAsync()
      .then(ip => {
        setLocalIp(ip || '127.0.0.1');
      })
      .catch(() => {
        setLocalIp('Wi-Fi Connected');
      });
  }, []);

  return (
    <LinearGradient
      colors={['#0B0F19', '#111A2E', '#0B0F19']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBadgeContainer}>
          <LinearGradient
            colors={['#00D2FF', '#0066FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Ionicons name="water" size={36} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>RanDrop</Text>
        <Text style={styles.subtitle}>
          Lossless local Wi-Fi file sharing across mobile & PC with QR scan
        </Text>

        <View style={styles.ipBadge}>
          <Ionicons name="wifi" size={15} color="#00D2FF" />
          <Text style={styles.ipText}>IP: {localIp}</Text>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.cardsContainer}>
        {/* Send Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onSendPress}
          style={styles.cardTouchable}
        >
          <LinearGradient
            colors={['#162238', '#121A2D']}
            style={styles.card}
          >
            <LinearGradient
              colors={['#00D2FF', '#0066FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="arrow-up" size={26} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.cardTextContainer}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Send Files</Text>
                <View style={styles.pillTag}>
                  <Text style={styles.pillText}>Up to 1 GB</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                Pick any file in 100% original quality, generate QR code, and share with multiple devices.
              </Text>
            </View>

            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={20} color="#00D2FF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Receive Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onReceivePress}
          style={styles.cardTouchable}
        >
          <LinearGradient
            colors={['#162238', '#121A2D']}
            style={styles.card}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="arrow-down" size={26} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.cardTextContainer}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Receive Files</Text>
                <View style={[styles.pillTag, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={[styles.pillText, { color: '#10B981' }]}>Fast Scan</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                Scan sender's QR code or enter local address to download directly at Wi-Fi speeds.
              </Text>
            </View>

            <View style={[styles.chevron, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="chevron-forward" size={20} color="#10B981" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Ionicons name="shield-checkmark" size={16} color="#58657B" />
        <Text style={styles.footerText}>
          Direct Peer-to-Peer • Zero Internet Data • Bit-for-Bit Lossless
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoBadgeContainer: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  ipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginTop: 16,
  },
  ipText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 18,
    marginVertical: 'auto',
  },
  cardTouchable: {
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2E49',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillTag: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D2FF',
  },
  cardDescription: {
    fontSize: 13,
    color: '#8E9BAE',
    lineHeight: 18,
  },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#58657B',
    fontWeight: '500',
  },
});
