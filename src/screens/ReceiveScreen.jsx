import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ReceiveScreen({ onBack }) {
  const [senderAddress, setSenderAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [savedUri, setSavedUri] = useState('');

  const normalizeUrl = (input) => {
    let url = input.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    if (!url.includes(':') || url.split(':').length === 2) {
      if (!url.includes(':8090')) {
        url = url + ':8090';
      }
    }
    return url;
  };

  const handleConnect = async () => {
    if (!senderAddress.trim()) {
      Alert.alert('Required', 'Please enter sender IP address (e.g. 192.168.1.5:8090)');
      return;
    }

    try {
      setIsConnecting(true);
      const url = normalizeUrl(senderAddress);
      const res = await fetch(`${url}/info`);
      if (!res.ok) throw new Error('Host not reachable');

      const data = await res.json();
      setFileInfo({
        name: data.name || 'received_file',
        size: data.size || 0,
        type: data.type,
        url: `${url}/download`,
      });
    } catch (err) {
      console.error('Failed to connect:', err);
      Alert.alert(
        'Connection Failed',
        'Could not find RanDrop sender. Ensure both devices are connected to the same Wi-Fi / Hotspot.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDownload = async () => {
    if (!fileInfo) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      if (Platform.OS === 'web') {
        // Direct browser / Electron download
        const a = document.createElement('a');
        a.href = fileInfo.url;
        a.download = fileInfo.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsDownloading(false);
        setDownloadCompleted(true);
        return;
      }

      // Android / iOS native download with progress
      const targetPath = `${FileSystem.documentDirectory}${fileInfo.name}`;
      const downloadResumable = FileSystem.createDownloadResumable(
        fileInfo.url,
        targetPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(Math.min(1, Math.max(0, progress)));
        }
      );

      const result = await downloadResumable.downloadAsync();
      setSavedUri(result.uri);
      setIsDownloading(false);
      setDownloadCompleted(true);
    } catch (err) {
      console.error('Download error:', err);
      setIsDownloading(false);
      Alert.alert('Download Error', 'Transfer was interrupted. Please retry.');
    }
  };

  const handleReset = () => {
    setFileInfo(null);
    setDownloadProgress(0);
    setIsDownloading(false);
    setDownloadCompleted(false);
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!fileInfo ? (
          <View style={styles.connectContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigIconCircle}
            >
              <Ionicons name="scan-outline" size={48} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.connectTitle}>Connect to Sender</Text>
            <Text style={styles.connectSubtitle}>
              Scan sender's QR code with your phone camera, or enter the sender's local Wi-Fi address below.
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="wifi" size={20} color="#8E9BAE" style={{ marginLeft: 16 }} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 192.168.1.15:8090"
                placeholderTextColor="#58657B"
                value={senderAddress}
                onChangeText={setSenderAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConnect}
              disabled={isConnecting}
              style={styles.connectBtnTouchable}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.connectBtn}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                    <Text style={styles.connectBtnText}>Connect & Fetch File</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#00D2FF" />
              <Text style={styles.tipText}>
                Tip: You can also open your normal mobile Camera or Chrome and scan the Sender's QR code to download instantly!
              </Text>
            </View>
          </View>
        ) : downloadCompleted ? (
          <View style={styles.successContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successBadge}
            >
              <Ionicons name="checkmark" size={54} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.successTitle}>Transfer Complete!</Text>
            <Text style={styles.successSubtitle}>
              {fileInfo.name} was saved with 100% original quality.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReset}
              style={styles.connectBtnTouchable}
            >
              <LinearGradient
                colors={['#00D2FF', '#0066FF']}
                style={styles.connectBtn}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.connectBtnText}>Receive Another File</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.readyCardContainer}>
            {/* File Card */}
            <View style={styles.readyCard}>
              <View style={styles.readyIconBox}>
                <Ionicons name="document-text" size={32} color="#00D2FF" />
              </View>

              <Text style={styles.readyFileName}>{fileInfo.name}</Text>
              <Text style={styles.readyFileSize}>{formatBytes(fileInfo.size)}</Text>

              <View style={styles.losslessBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.losslessBadgeText}>Original Bit-for-Bit Lossless Quality</Text>
              </View>

              {isDownloading ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.round(downloadProgress * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    Downloading... {Math.round(downloadProgress * 100)}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDownload}
                  style={styles.downloadBtnTouchable}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.downloadBtn}
                  >
                    <Ionicons name="download" size={22} color="#FFFFFF" />
                    <Text style={styles.downloadBtnText}>Start Download ⚡</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity activeOpacity={0.7} onPress={handleReset} style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Cancel / Change Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  connectContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  bigIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162238',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2E49',
    width: '100%',
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  connectBtnTouchable: {
    width: '100%',
    borderRadius: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 28,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  tipText: {
    flex: 1,
    color: '#8E9BAE',
    fontSize: 13,
    lineHeight: 18,
  },
  readyCardContainer: {
    marginTop: 30,
  },
  readyCard: {
    backgroundColor: '#162238',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2E49',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  readyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  readyFileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  readyFileSize: {
    fontSize: 14,
    color: '#8E9BAE',
    fontWeight: '600',
    marginBottom: 14,
  },
  losslessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 28,
  },
  losslessBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadBtnTouchable: {
    width: '100%',
    borderRadius: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelLink: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    color: '#8E9BAE',
    fontSize: 13,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#0B0F19',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  progressText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  successBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
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
    maxWidth: 300,
  },
});
