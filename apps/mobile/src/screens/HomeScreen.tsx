import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { RainEffect } from '../components/RainEffect';
import { TaskComposerCard } from '../components/TaskComposerCard';
import { colors, fonts, spacing } from '../theme';


type Props = {
  activeTab: number;
  onTabPress: (i: number) => void;
};

export function HomeScreen({ activeTab, onTabPress }: Props) {
  function handleSend(text: string) {
    console.log('Task prompt:', text);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AtmosphericBackground />
      <RainEffect />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="cloud" size={64} color={colors.primary} style={styles.cloudIcon} />
          <Text style={styles.heroTitle}>Raincloud</Text>
        </View>
        <View style={styles.composerWrapper}>
          <TaskComposerCard onSend={handleSend} />
        </View>
      </ScrollView>

      <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: spacing.screenMargin,
    paddingBottom: 140,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  cloudIcon: {
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 48,
    letterSpacing: -2,
    lineHeight: 56,
    color: '#ffffff',
  },
  composerWrapper: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
});
