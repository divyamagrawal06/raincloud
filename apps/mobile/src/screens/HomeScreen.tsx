import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PickedFile } from '../api/raincloudClient';
import { createPlan, uploadPdfs } from '../api/raincloudClient';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { RainEffect } from '../components/RainEffect';
import { TaskComposerCard } from '../components/TaskComposerCard';
import type { Route } from '../navigation';
import { colors, fonts, spacing, typography } from '../theme';

type Props = {
  activeTab: number;
  onTabPress: (i: number) => void;
  onNavigate: (route: Route) => void;
};

export function HomeScreen({ activeTab, onTabPress, onNavigate }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(text: string, files: PickedFile[]) {
    if (files.length === 0) {
      setError('Attach at least one PDF to start a merge task.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { taskId } = await uploadPdfs(files);
      const planResult = await createPlan({ taskId, prompt: text || 'Merge these PDFs.' });

      if (planResult.status === 'plan_review') {
        onNavigate({ name: 'plan-review', taskId, planResult });
      } else {
        setError('The planner needs more information. Full clarifying-question flow coming soon.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
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

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.composerWrapper}>
          <TaskComposerCard onSend={handleSend} disabled={isLoading} />
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(248,113,113,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: '#f87171',
    flex: 1,
  },
  composerWrapper: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
});
