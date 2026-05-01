import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { approvePlan, createPlan } from '../api/raincloudClient';
import type { PlanResult } from '../api/raincloudClient';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { GlassCard } from '../components/GlassCard';
import { RainEffect } from '../components/RainEffect';
import { colors, fonts, radii, spacing, typography } from '../theme';

type Props = {
  taskId: string;
  planResult: PlanResult & { status: 'plan_review' };
  onApproved: (taskId: string, runId: string) => void;
  onBack: () => void;
  activeTab: number;
  onTabPress: (i: number) => void;
};

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function StepRow({ index, text }: { index: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{index + 1}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

export function PlanReviewScreen({ taskId, planResult, onApproved, onBack, activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const [currentPlanResult, setCurrentPlanResult] = useState(planResult);
  const [reorderText, setReorderText] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);

  const { plan, orderedAttachments } = currentPlanResult;

  async function handleReorder() {
    const instruction = reorderText.trim();
    if (!instruction) return;
    setIsReplanning(true);
    setReplanError(null);
    try {
      const result = await createPlan({ taskId, prompt: instruction });
      if (result.status === 'plan_review') {
        setCurrentPlanResult(result);
        setReorderText('');
      } else {
        setReplanError('Planner returned a clarifying question — try a more specific instruction.');
      }
    } catch (e) {
      setReplanError(e instanceof Error ? e.message : 'Reorder failed.');
    } finally {
      setIsReplanning(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    setApproveError(null);
    try {
      const result = await approvePlan({ taskId, planId: plan.id });
      onApproved(result.taskId, result.runId);
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : 'Approval failed. Try again.');
      setIsApproving(false);
    }
  }

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <RainEffect />

      {/* Nav bar */}
      <View style={[styles.navbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Review Plan</Text>
          <Text style={styles.subtitle}>{currentPlanResult.summary}</Text>
        </View>

        {/* Files to merge */}
        <SectionLabel text="Files to merge" />
        <GlassCard style={styles.section}>
          {orderedAttachments.map((attachment, index) => (
            <View key={attachment.id} style={[styles.fileRow, index > 0 && styles.fileRowBorder]}>
              <View style={styles.fileOrderBadge}>
                <Text style={styles.fileOrderText}>{index + 1}</Text>
              </View>
              <Ionicons name="document-outline" size={16} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {attachment.displayName}
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Plan details */}
        {plan.assumptions.length > 0 && (
          <>
            <SectionLabel text="Assumptions" />
            <GlassCard style={styles.section}>
              {plan.assumptions.map((a, i) => (
                <Text key={i} style={styles.bulletItem}>· {a}</Text>
              ))}
            </GlassCard>
          </>
        )}

        <SectionLabel text="Steps" />
        <GlassCard style={styles.section}>
          {plan.steps.map((s, i) => <StepRow key={i} index={i} text={s} />)}
        </GlassCard>

        {/* Expected output */}
        <SectionLabel text="Output" />
        <GlassCard style={styles.section}>
          <View style={styles.outputRow}>
            <Ionicons name="document-outline" size={18} color={colors.primary} />
            <Text style={styles.outputName}>{plan.expectedArtifacts[0]?.name ?? 'merged.pdf'}</Text>
          </View>
        </GlassCard>

        {/* Reorder */}
        <SectionLabel text="Adjust order" />
        <GlassCard style={styles.section}>
          <Text style={styles.reorderHint}>
            Describe any changes in natural language, e.g. "do Q3 Report before Q2 Report".
          </Text>
          <TextInput
            style={styles.reorderInput}
            value={reorderText}
            onChangeText={setReorderText}
            placeholder="Reorder instruction…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline={false}
            editable={!isReplanning}
          />
          {replanError && (
            <Text style={styles.errorText}>{replanError}</Text>
          )}
          <TouchableOpacity
            style={[styles.reorderBtn, (isReplanning || !reorderText.trim()) && styles.reorderBtnDisabled]}
            onPress={handleReorder}
            activeOpacity={0.8}
            disabled={isReplanning || !reorderText.trim()}
          >
            {isReplanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.reorderBtnLabel}>Apply</Text>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* Approve */}
        {approveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
            <Text style={styles.errorText}>{approveError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.approveBtn, isApproving && styles.approveBtnDisabled]}
          onPress={handleApprove}
          activeOpacity={0.85}
          disabled={isApproving}
        >
          {isApproving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.approveBtnLabel}>Approve & Run</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: spacing.screenMargin,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.bodyLg,
    color: '#007AFF',
  },
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: spacing.screenMargin },
  header: { marginBottom: spacing.lg },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  section: { marginBottom: spacing.sm },
  sectionLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  fileRowBorder: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  fileOrderBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: 'rgba(173,198,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileOrderText: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 11,
  },
  fileName: {
    ...typography.bodySm,
    color: '#fff',
    flex: 1,
  },
  bulletItem: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 6,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  stepText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    lineHeight: 20,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  outputName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#fff',
  },
  reorderHint: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  reorderInput: {
    ...typography.bodySm,
    color: colors.onSurface,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  reorderBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.full,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  reorderBtnDisabled: {
    opacity: 0.4,
  },
  reorderBtnLabel: {
    ...typography.bodySm,
    color: '#fff',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(248,113,113,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: '#f87171',
    flex: 1,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryAction,
    borderRadius: radii.full,
    height: 52,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.primaryAction,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  approveBtnDisabled: {
    opacity: 0.6,
  },
  approveBtnLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: '#fff',
  },
});
