import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ReceiveScreen({ onBack }) {
  const [address, setAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  const connectToSender = async (targetUrl) => {
    if (!targetUrl.trim()) {
      alert('Please enter sender address (e.g. 192.168.1.15:8090)');
      return;
    }

    try {
      setIsConnecting(true);
      let url = targetUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      if (!url.includes(':') || url.split(':').length === 2) {
        if (!url.includes(':8090')) {
          url = url + ':8090';
        }
      }

      const res = await fetch(`${url}/info`);
      if (!res.ok) throw new Error('Sender unreachable');

      const data = await res.json();
      const info = {
        name: data.name || 'received_file',
        size: data.size || 0,
        type: data.type,
        url: `${url}/download`,
      };

      setFileInfo(info);
      setIsConnecting(false);

      // Trigger direct download
      startDownload(info);
    } catch (err) {
      console.error('Connection failed:', err);
      setIsConnecting(false);
      alert('Could not reach AirBeam sender. Ensure both devices are on the same Wi-Fi / Hotspot.');
    }
  };

  const startDownload = (info) => {
    setIsDownloading(true);
    const a = document.createElement('a');
    a.href = info.url;
    a.download = info.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsDownloading(false);
    setDownloadCompleted(true);
  };

  const handleReset = () => {
    setFileInfo(null);
    setIsDownloading(false);
    setDownloadCompleted(false);
    setAddress('');
  };

  return (
    <LinearGradient
      colors={['#0B0F19', '#111A2E', '#0B0F19']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Receive File</Text>
        <View style={{ width: 40 }} />
      </View>

      {!fileInfo && !downloadCompleted ? (
        <View style={styles.contentContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bigIconCircle}
          >
            <Ionicons name="cloud-download" size={48} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.title}>Receive from Mobile / PC</Text>
          <Text style={styles.subtitle}>
            Enter sender's Wi-Fi address (from the sender's AirBeam QR screen) to download at Wi-Fi speeds.
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="link" size={20} color="#8E9BAE" style={{ marginLeft: 16 }} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 192.168.1.15:8090"
              placeholderTextColor="#58657B"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => connectToSender(address)}
            disabled={isConnecting}
            style={styles.btnTouchable}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.btn}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#FFFFFF" />
                  <Text style={styles.btnText}>Connect & Download ⚡</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.hintCard}>
            <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            <Text style={styles.hintText}>
              100% Bit-for-Bit Lossless Transfer • Zero Internet Data
            </Text>
          </View>
        </View>
      ) : downloadCompleted ? (
        <View style={styles.contentContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successBadge}
          >
            <Ionicons name="checkmark" size={54} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.successTitle}>Transfer Complete!</Text>
          <Text style={styles.successSubtitle}>
            {fileInfo?.name} was downloaded with 100% original quality.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReset}
            style={styles.btnTouchable}
          >
            <LinearGradient
              colors={['#00D2FF', '#0066FF']}
              style={styles.btn}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.btnText}>Receive Another File</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <ActivityIndicator size="large" color="#00D2FF" />
          <Text style={{ color: '#00D2FF', marginTop: 16, fontSize: 16, fontWeight: '600' }}>
            Fetching file...
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#162238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  bigIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162238',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2E49',
    width: '100%',
    marginBottom: 18,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  btnTouchable: {
    width: '100%',
    borderRadius: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  hintText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  successBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
  },
});
