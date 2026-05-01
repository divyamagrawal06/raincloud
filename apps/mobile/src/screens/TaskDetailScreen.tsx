import { Ionicons } from '@expo/vector-icons';
import type { Task, TaskStatus } from '@raincloud/domain';
import { isTerminalTaskStatus } from '@raincloud/domain';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtifactDownloadUrl, getTask as getTaskFromApi } from '../api/raincloudClient';
import type { TaskResponse } from '../api/raincloudClient';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { GlassCard } from '../components/GlassCard';
import { LaneTag } from '../components/LaneTag';
import { RainEffect } from '../components/RainEffect';
import { StatusChip } from '../components/StatusChip';
import { MOCK_ARTIFACTS, MOCK_FAILURE_REASONS, MOCK_PLANS, MOCK_TASKS } from '../fixtures';
import { colors, fonts, radii, spacing, typography } from '../theme';

const POLL_INTERVAL_MS = 3000;

type Props = {
  taskId: string;
  activeTab: number;
  onTabPress: (i: number) => void;
  onBack: () => void;
  onTaskUpdate?: (task: Task) => void;
};

const STATUS_ICON: Record<TaskStatus, keyof typeof Ionicons.glyphMap> = {
  draft:       'create-outline',
  clarifying:  'chatbubble-ellipses-outline',
  plan_review: 'clipboard-outline',
  queued:      'time-outline',
  planning:    'bulb-outline',
  running:     'play-circle-outline',
  needs_input: 'alert-circle-outline',
  succeeded:   'checkmark-circle-outline',
  failed:      'close-circle-outline',
  canceled:    'ban-outline',
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

function buildFixtureResponse(taskId: string): TaskResponse | null {
  const mockTask = MOCK_TASKS.find((t) => t.id === taskId);
  if (!mockTask) return null;
  return {
    task: mockTask,
    plan: mockTask.activePlanId ? (MOCK_PLANS[mockTask.activePlanId] ?? null) : null,
    run: null,
    artifacts: mockTask.artifactIds.map((id) => MOCK_ARTIFACTS[id]).filter(Boolean),
  };
}

export function TaskDetailScreen({ taskId, activeTab, onTabPress, onBack, onTaskUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const [taskData, setTaskData] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getTaskFromApi(taskId);
        if (!active) return;
        setTaskData(data);
        onTaskUpdate?.(data.task);
        // Stop polling once terminal
        if (isTerminalTaskStatus(data.task.status) && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // Fall back to fixture data for demo/mock tasks
        if (!active) return;
        const fixture = buildFixtureResponse(taskId);
        if (fixture) {
          setTaskData(fixture);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload(artifactId: string) {
    const { url } = getArtifactDownloadUrl(artifactId);
    await Linking.openURL(url);
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <AtmosphericBackground />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!taskData) {
    return (
      <View style={[styles.root, styles.centered]}>
        <AtmosphericBackground />
        <Text style={{ color: '#fff' }}>Task not found.</Text>
      </View>
    );
  }

  const { task, plan, run, artifacts } = taskData;
  const isRunning = task.status === 'running';
  const isPlanReview = task.status === 'plan_review';
  const isSucceeded = task.status === 'succeeded';
  const isFailed = task.status === 'failed';
  const failureReason = run?.failureReason ?? MOCK_FAILURE_REASONS[task.id];

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <RainEffect />

      {/* Nav bar */}
      <View style={[styles.navbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.backLabel}>Tasks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            {task.lane && <LaneTag lane={task.lane} />}
            <StatusChip status={task.status} />
          </View>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskPrompt}>{task.prompt}</Text>
        </View>

        {/* Status card */}
        <GlassCard style={styles.section}>
          <View style={styles.statusRow}>
            <Ionicons
              name={STATUS_ICON[task.status]}
              size={22}
              color={isSucceeded ? '#34d399' : isFailed ? '#f87171' : isRunning ? '#007AFF' : colors.onSurfaceVariant}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {isRunning ? 'Running now' : isSucceeded ? 'Completed' : isFailed ? 'Failed' : task.status.replace('_', ' ')}
              </Text>
              {isRunning && (
                <Text style={styles.statusSub}>Checking for updates every {POLL_INTERVAL_MS / 1000}s…</Text>
              )}
              {isFailed && failureReason && (
                <Text style={[styles.statusSub, { color: '#f87171' }]}>
                  {failureReason}
                </Text>
              )}
            </View>
            {(task.status === 'queued' || isRunning) && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
        </GlassCard>

        {/* Plan */}
        {plan && (
          <>
            <SectionLabel text="Plan" />
            <GlassCard style={styles.section}>
              <Text style={styles.planGoal}>{plan.goal}</Text>

              {plan.assumptions.length > 0 && (
                <View style={styles.planBlock}>
                  <Text style={styles.planBlockLabel}>Assumptions</Text>
                  {plan.assumptions.map((a, i) => (
                    <Text key={i} style={styles.bulletItem}>· {a}</Text>
                  ))}
                </View>
              )}

              <View style={styles.planBlock}>
                <Text style={styles.planBlockLabel}>Steps</Text>
                {plan.steps.map((s, i) => <StepRow key={i} index={i} text={s} />)}
              </View>

              {plan.risks.length > 0 && (
                <View style={styles.planBlock}>
                  <Text style={styles.planBlockLabel}>Risks</Text>
                  {plan.risks.map((r, i) => (
                    <View key={i} style={styles.riskRow}>
                      <Ionicons name="warning-outline" size={13} color="#fbbf24" />
                      <Text style={styles.riskText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>

            {/* Estimate */}
            <GlassCard style={styles.section}>
              <View style={styles.estimateGrid}>
                <View style={styles.estimateCell}>
                  <Text style={styles.estimateValue}>
                    {plan.estimate.creditMin}–{plan.estimate.creditMax}
                  </Text>
                  <Text style={styles.estimateLabel}>Credits</Text>
                </View>
                {plan.estimate.runtimeSecondsMin != null && (
                  <View style={styles.estimateCell}>
                    <Text style={styles.estimateValue}>
                      {Math.ceil(plan.estimate.runtimeSecondsMin / 60)}–{Math.ceil((plan.estimate.runtimeSecondsMax ?? plan.estimate.runtimeSecondsMin) / 60)} min
                    </Text>
                    <Text style={styles.estimateLabel}>Runtime</Text>
                  </View>
                )}
                {plan.estimate.limits.map((l) => (
                  <View key={l.key} style={styles.estimateCell}>
                    <Text style={styles.estimateValue}>{l.value}</Text>
                    <Text style={styles.estimateLabel}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        {/* Approve CTA — shown for demo mock tasks in plan_review; real tasks go through PlanReviewScreen */}
        {isPlanReview && !run && (
          <TouchableOpacity style={styles.approveBtn} activeOpacity={0.85}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.approveBtnLabel}>Approve & Run</Text>
          </TouchableOpacity>
        )}

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <>
            <SectionLabel text="Output files" />
            <GlassCard style={styles.section}>
              {artifacts.map((artifact, i) => (
                <View key={artifact.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.artifactRow}>
                    <Ionicons
                      name={artifact.kind === 'audio' ? 'musical-note' : artifact.kind === 'pull_request' ? 'git-pull-request-outline' : 'document-outline'}
                      size={20}
                      color={colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.artifactName}>{artifact.name}</Text>
                      {artifact.description && (
                        <Text style={styles.artifactDesc}>{artifact.description}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      activeOpacity={0.7}
                      onPress={() => handleDownload(artifact.id)}
                    >
                      <Ionicons name="download-outline" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>

      <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  centered: { alignItems: 'center', justifyContent: 'center' },
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  taskTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 6,
  },
  taskPrompt: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 20,
  },
  section: { marginBottom: spacing.sm },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  statusTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: '#fff',
    textTransform: 'capitalize',
  },
  statusSub: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: 2,
  },
  planGoal: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  planBlock: { marginTop: spacing.sm },
  planBlockLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
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
  },
  stepText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    lineHeight: 20,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  riskText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    lineHeight: 20,
  },
  estimateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  estimateCell: { minWidth: 80 },
  estimateValue: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: -0.3,
  },
  estimateLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: radii.full,
    height: 52,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  approveBtnLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: '#fff',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.sm,
  },
  artifactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  artifactName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#fff',
  },
  artifactDesc: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,122,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
