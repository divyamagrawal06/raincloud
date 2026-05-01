import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const CLOUD_IMAGE = require('../../assets/cloud-bg.jpg');

export function AtmosphericBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={CLOUD_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          'transparent',
          `rgba(16,19,27,0.55)`,
          `rgba(16,19,27,0.85)`,
          colors.surface,
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
