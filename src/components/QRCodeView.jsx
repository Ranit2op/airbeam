import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { generateQRCode } from '../utils/qrHelper';

export function QRCodeView({ value, size = 220 }) {
  const qrData = useMemo(() => {
    if (!value) return null;
    return generateQRCode(value);
  }, [value]);

  if (!qrData || !qrData.matrix) {
    return <View style={[styles.container, { width: size, height: size }]} />;
  }

  const { count, matrix } = qrData;
  const padding = 12;
  const availableSize = size - padding * 2;
  const cellSize = availableSize / count;

  return (
    <View style={[styles.container, { width: size, height: size, padding }]}>
      <View style={{ width: availableSize, height: availableSize }}>
        {matrix.map((row, rIdx) => (
          <View key={`r-${rIdx}`} style={{ flexDirection: 'row', height: cellSize }}>
            {row.map((isDark, cIdx) => (
              <View
                key={`c-${cIdx}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isDark ? '#000000' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
});
