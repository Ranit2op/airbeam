import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Network from 'expo-network';
import { QRCodeView } from '../components/QRCodeView';
import { LocalServer } from '../services/LocalServer';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB in bytes

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SendScreen({ onBack }) {
  const [file, setFile] = useState(null);
  const [localIp, setLocalIp] = useState('127.0.0.1');
  const [isHosting, setIsHosting] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const serverRef = useRef(new LocalServer());

  useEffect(() => {
    // 1. Electron IP detection
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('get-local-ip').then(ip => {
          if (ip) setLocalIp(ip);
        }).catch(() => {});
      } catch (e) {}
    }

    // 2. Mobile Expo IP detection
    Network.getIpAddressAsync()
      .then(ip => {
        if (ip) setLocalIp(ip);
      })
      .catch(() => {});

    return () => {
      serverRef.current.stop();
    };
  }, []);

  const handlePickFile = async () => {
    try {
      setIsLoading(true);

      // 1. If running inside Electron on Windows Desktop
      if (typeof window !== 'undefined' && window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const res = await ipcRenderer.invoke('select-file');
          if (res.canceled || !res.path) {
            setIsLoading(false);
            return;
          }

          if (res.size > MAX_FILE_SIZE) {
            alert('File exceeds 1 GB limit! Please select a file under 1 GB.');
            setIsLoading(false);
            return;
          }

          startHosting(res);
          return;
        } catch (electronErr) {
          console.warn('Native Electron picker error:', electronErr);
        }
      }

      // 2. On standard Web / Browser
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.oncancel = () => {
          setIsLoading(false);
        };
        input.onchange = async (e) => {
          const selectedFile = e.target.files[0];
          if (!selectedFile) {
            setIsLoading(false);
            return;
          }

          if (selectedFile.size > MAX_FILE_SIZE) {
            alert('File exceeds 1 GB limit! Please select a file under 1 GB.');
            setIsLoading(false);
            return;
          }

          const fileInfo = {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type || 'application/octet-stream',
            path: selectedFile.path || null,
          };

          if (!selectedFile.path) {
            const buffer = await selectedFile.arrayBuffer();
            fileInfo.data = new Uint8Array(buffer);
          }

          startHosting(fileInfo);
        };
        input.click();
        return;
      }

      // 3. On Android / iOS Native
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        setIsLoading(false);
        return;
      }

      const asset = res.assets[0];

      if (asset.size && asset.size > MAX_FILE_SIZE) {
        Alert.alert(
          'File Too Large',
          'AirBeam supports up to 1 GB at a time to ensure maximum stability and lossless quality. Please select a file under 1 GB.'
        );
        setIsLoading(false);
        return;
      }

      const fileInfo = {
        name: asset.name,
        size: asset.size || 0,
        type: asset.mimeType || 'application/octet-stream',
        uri: asset.uri,
      };

      startHosting(fileInfo);
    } catch (err) {
      console.error('File pick error:', err);
      Alert.alert('Error', 'Could not select file. Please try again.');
      setIsLoading(false);
    }
  };

  const startHosting = async (fileInfo) => {
    try {
      setFile(fileInfo);
      serverRef.current.setFile(fileInfo);
      serverRef.current.onClientConnected = (count) => {
        setClientsCount(count);
      };

      const port = await serverRef.current.start(8090);
      setIsHosting(true);
    } catch (e) {
      console.error('Failed to start server:', e);
      Alert.alert('Error', 'Failed to start Wi-Fi host server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    serverRef.current.stop();
    setIsHosting(false);
    setFile(null);
    setClientsCount(0);
  };

  const shareUrl = `http://${localIp}:8090`;

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
        <Text style={styles.topBarTitle}>Send File</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isHosting ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#00D2FF', '#0066FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigIconCircle}
            >
              <Ionicons name="cloud-upload" size={48} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.selectPrompt}>Select File to Send</Text>
            <Text style={styles.selectDesc}>
              Any photo, video, document, archive, or APK up to 1 GB. Original quality is 100% preserved.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePickFile}
              disabled={isLoading}
              style={styles.pickButtonTouchable}
            >
              <LinearGradient
                colors={['#00D2FF', '#0066FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pickButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="document-text" size={20} color="#FFFFFF" />
                    <Text style={styles.pickButtonText}>Browse Files</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.qualityNotice}>
              <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
              <Text style={styles.qualityNoticeText}>Bit-for-Bit Lossless • Zero Internet Needed</Text>
            </View>
          </View>
        ) : (
          <View style={styles.hostingContainer}>
            {/* File Info Card */}
            <View style={styles.fileCard}>
              <View style={styles.fileIconBox}>
                <Ionicons name="document" size={28} color="#00D2FF" />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <View style={styles.fileMetaRow}>
                  <Text style={styles.fileSizeText}>{formatBytes(file.size)}</Text>
                  <View style={styles.losslessBadge}>
                    <Text style={styles.losslessBadgeText}>100% ORIGINAL QUALITY</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* QR Code Card */}
            <View style={styles.qrCard}>
              <Text style={styles.qrHeaderTitle}>Scan to Download</Text>
              <Text style={styles.qrHeaderSubtitle}>
                Scan with AirBeam or any Camera / Browser
              </Text>

              <View style={styles.qrWrapper}>
                <QRCodeView value={shareUrl} size={220} />
              </View>

              <View style={styles.urlBadge}>
                <Ionicons name="link" size={16} color="#00D2FF" />
                <Text style={styles.urlText} selectable>{shareUrl}</Text>
              </View>

              <View style={styles.multiDevicePill}>
                <Ionicons name="people" size={16} color="#10B981" />
                <Text style={styles.multiDeviceText}>
                  Multi-device ready: Multiple devices can scan together!
                </Text>
              </View>
            </View>

            {/* Live Stats */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Ionicons name="radio-outline" size={20} color="#00D2FF" />
                <Text style={styles.statLabel}>Status</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>Sharing Live</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="download-outline" size={20} color="#00D2FF" />
                <Text style={styles.statLabel}>Downloads</Text>
                <Text style={styles.statValue}>{clientsCount}</Text>
              </View>
            </View>

            {/* Stop Button */}
            <TouchableOpacity activeOpacity={0.85} onPress={handleStop} style={styles.stopButton}>
              <Ionicons name="stop-circle" size={20} color="#FF4D4D" />
              <Text style={styles.stopButtonText}>Stop Sharing</Text>
            </TouchableOpacity>
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  bigIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  selectPrompt: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  selectDesc: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 32,
  },
  pickButtonTouchable: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  qualityNotice: {
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
  qualityNoticeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  hostingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1F2E49',
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileSizeText: {
    fontSize: 13,
    color: '#8E9BAE',
    fontWeight: '500',
  },
  losslessBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  losslessBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  qrCard: {
    backgroundColor: '#162238',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1F2E49',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  qrHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  qrHeaderSubtitle: {
    fontSize: 13,
    color: '#8E9BAE',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 18,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  urlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D2FF',
  },
  multiDevicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  multiDeviceText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1F2E49',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1F2E49',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E9BAE',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: '100%',
  },
  stopButtonText: {
    color: '#FF4D4D',
    fontSize: 15,
    fontWeight: '700',
  },
});
