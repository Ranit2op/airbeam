import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeScreen } from './src/screens/HomeScreen';
import { SendScreen } from './src/screens/SendScreen';
import { ReceiveScreen } from './src/screens/ReceiveScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsSplashVisible(false);
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) {
    return (
      <LinearGradient
        colors={['#080C14', '#0F172A', '#080C14']}
        style={styles.splashContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor="#080C14" />
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.splashIconWrapper}>
            <Image
              source={require('./assets/images/icon.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.splashTitle}>RanDrop</Text>
          <Text style={styles.splashTagline}>Fast & Lossless Local Sharing</Text>
          <View style={styles.splashDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      {currentScreen === 'home' && (
        <HomeScreen
          onSendPress={() => setCurrentScreen('send')}
          onReceivePress={() => setCurrentScreen('receive')}
        />
      )}
      {currentScreen === 'send' && (
        <SendScreen onBack={() => setCurrentScreen('home')} />
      )}
      {currentScreen === 'receive' && (
        <ReceiveScreen onBack={() => setCurrentScreen('home')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashIconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
    marginBottom: 24,
  },
  splashLogo: {
    width: '100%',
    height: '100%',
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  splashTagline: {
    fontSize: 15,
    color: '#00D2FF',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 28,
  },
  splashDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  activeDot: {
    backgroundColor: '#00D2FF',
    width: 24,
  },
});
