import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

let CameraView = null;
let useCameraPermissions = null;

try {
  const cameraPkg = require('expo-camera');
  CameraView = cameraPkg.CameraView;
  useCameraPermissions = cameraPkg.useCameraPermissions;
} catch (e) {
  console.warn('expo-camera not loaded:', e);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ReceiveScreen({ onBack }) {
  const [hasScanned, setHasScanned] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const [permission, requestPermission] = useCameraPermissions
    ? useCameraPermissions()
    : [null, () => {}];

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ data }) => {
    if (hasScanned || isConnecting || fileInfo) return;
    if (!data) return;

    let scannedUrl = data.trim();
    if (scannedUrl.startsWith('http://') || scannedUrl.startsWith('https://')) {
      setHasScanned(true);
      connectToSender(scannedUrl);
    }
  };

  const connectToSender = async (targetUrl) => {
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

      // Automatically initiate high-speed download
      startDownload(info);
    } catch (err) {
      console.error('Connection failed:', err);
      setIsConnecting(false);
      setHasScanned(false);
      Alert.alert(
        'Connection Failed',
        'Could not reach AirBeam sender. Ensure both devices are on the same Wi-Fi / Hotspot.'
      );
    }
  };

  const startDownload = async (info) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = info.url;
        a.download = info.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsDownloading(false);
        setDownloadCompleted(true);
        return;
      }

      // Android / iOS native chunked download
      const targetPath = `${FileSystem.documentDirectory}${info.name}`;
      const downloadResumable = FileSystem.createDownloadResumable(
        info.url,
        targetPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(Math.min(1, Math.max(0, progress)));
        }
      );

      await downloadResumable.downloadAsync();
      setIsDownloading(false);
      setDownloadCompleted(true);
    } catch (err) {
      console.error('Download error:', err);
      setIsDownloading(false);
      Alert.alert('Download Error', 'Download was interrupted. Please retry.');
    }
  };

  const handleReset = () => {
    setFileInfo(null);
    setDownloadProgress(0);
    setIsDownloading(false);
    setDownloadCompleted(false);
    setHasScanned(false);
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
        <TouchableOpacity
          onPress={() => setShowManualInput(!showManualInput)}
          style={styles.backBtn}
        >
          <Ionicons name={showManualInput ? 'camera' : 'keypad'} size={20} color="#00D2FF" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {!fileInfo && !downloadCompleted ? (
        showManualInput || (CameraView && permission && !permission.granted) ? (
          <View style={styles.manualContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigIconCircle}
            >
              <Ionicons name="wifi" size={44} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.manualTitle}>Manual Connect</Text>
            <Text style={styles.manualSubtitle}>
              Enter the sender's local Wi-Fi address (or tap the camera icon above to scan QR).
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="link" size={20} color="#8E9BAE" style={{ marginLeft: 16 }} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 192.168.1.15:8090"
                placeholderTextColor="#58657B"
                value={manualAddress}
                onChangeText={setManualAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => connectToSender(manualAddress)}
              disabled={isConnecting}
              style={styles.connectBtnTouchable}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.connectBtn}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#FFFFFF" />
                    <Text style={styles.connectBtnText}>Connect & Receive</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {permission && !permission.granted && (
              <TouchableOpacity
                onPress={requestPermission}
                style={styles.permissionPromptBtn}
              >
                <Ionicons name="camera" size={16} color="#00D2FF" />
                <Text style={styles.permissionPromptText}>Enable Camera Scanner</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.scannerWrapper}>
            {/* Live Camera Scanner View */}
            {CameraView && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
              />
            )}

            {/* Viewfinder Target Overlay */}
            <View style={styles.overlayContainer}>
              <View style={styles.targetFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.laserLine} />
              </View>

              <View style={styles.scannerPromptPill}>
                {isConnecting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#00D2FF" />
                    <Text style={styles.scannerPromptText}>Connecting to Sender...</Text>
                  </View>
                ) : (
                  <Text style={styles.scannerPromptText}>
                    Point camera at Sender's QR Code
                  </Text>
                )}
              </View>
            </View>
          </View>
        )
      ) : downloadCompleted ? (
        <View style={styles.centerContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successBadge}
          >
            <Ionicons name="checkmark" size={54} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.successTitle}>Transfer Complete!</Text>
          <Text style={styles.successSubtitle}>
            {fileInfo?.name} was saved with 100% bit-for-bit original quality.
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
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.connectBtnText}>Scan Another QR Code</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          {/* Download Progress Card */}
          <View style={styles.downloadingCard}>
            <View style={styles.fileIconCircle}>
              <Ionicons name="cloud-download" size={36} color="#00D2FF" />
            </View>

            <Text style={styles.cardFileName} numberOfLines={2}>
              {fileInfo?.name}
            </Text>
            <Text style={styles.cardFileSize}>
              {formatBytes(fileInfo?.size)}
            </Text>

            <View style={styles.losslessBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.losslessBadgeText}>100% Original Lossless Quality</Text>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarActive,
                    { width: `${Math.round(downloadProgress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentText}>
                Downloading... {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');
const TARGET_SIZE = Math.min(width * 0.72, 280);

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
    zIndex: 10,
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
  scannerWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00D2FF',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#00D2FF',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  scannerPromptPill: {
    marginTop: 32,
    backgroundColor: 'rgba(22, 34, 56, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scannerPromptText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  manualContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  manualTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  manualSubtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    textAlign: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
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
  permissionPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    padding: 10,
  },
  permissionPromptText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingCard: {
    backgroundColor: '#162238',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2E49',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  fileIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardFileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardFileSize: {
    fontSize: 14,
    color: '#8E9BAE',
    fontWeight: '600',
    marginBottom: 16,
  },
  losslessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 24,
  },
  losslessBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#0B0F19',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 6,
  },
  progressPercentText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '700',
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
