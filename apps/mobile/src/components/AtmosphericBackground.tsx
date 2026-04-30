import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const CLOUD_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA8viE6gOu3omGtuuevNLK1iJCV90pqvD4V98VQO4TUJ0-ood2zTEz_vMXMBXPoBXrU3DpGuRPnrGtmHeyuYoks611A3lbasXTXOfJUnF3_92pASAGihUWV-B7MD0cV37l7Crh9SKbZ7xtDzDUSSbfP5Z-ZnIcWyiiZt74GhVWZw4c26Efed3DZl99mwrtSHHx7prrxH3xsm4bSSv7jK-k_hvYA90HyLnYt75g2Ebu9Oh5bXs5dNC0jXX78i_WfAvlWmmCFizV7nb0';

export function AtmosphericBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={{ uri: CLOUD_IMAGE }}
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
