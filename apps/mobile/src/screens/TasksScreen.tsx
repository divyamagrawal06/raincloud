import { Ionicons } from '@expo/vector-icons';
import type { Task, TaskStatus } from '@raincloud/domain';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { GlassCard } from '../components/GlassCard';
import { LaneTag } from '../components/LaneTag';
import { RainEffect } from '../components/RainEffect';
import { StatusChip } from '../components/StatusChip';
import { MOCK_TASKS } from '../fixtures';
import type { Route } from '../navigation';
import { colors, fonts, spacing, typography } from '../theme';
import { timeAgo } from '../utils/timeAgo';

type Filter = 'all' | 'active' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const ACTIVE_STATUSES: TaskStatus[] = ['clarifying', 'plan_review', 'queued', 'planning', 'running', 'needs_input'];
const DONE_STATUSES: TaskStatus[] = ['succeeded', 'failed', 'canceled'];

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            {task.lane && <LaneTag lane={task.lane} />}
            <Text style={styles.timeAgo}>{timeAgo(task.updatedAt)}</Text>
          </View>
          <StatusChip status={task.status} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
        <Text style={styles.cardPrompt} numberOfLines={2}>{task.prompt}</Text>
        <View style={styles.cardFooter}>
          {task.artifactIds.length > 0 && (
            <View style={styles.artifactBadge}>
              <Ionicons name="attach-outline" size={13} color={colors.primary} />
              <Text style={styles.artifactCount}>{task.artifactIds.length} file{task.artifactIds.length > 1 ? 's' : ''}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

type Props = {
  activeTab: number;
  onTabPress: (i: number) => void;
  onNavigate: (route: Route) => void;
};

export function TasksScreen({ activeTab, onTabPress, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = MOCK_TASKS.filter((t) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(t.status);
    if (filter === 'done') return DONE_STATUSES.includes(t.status);
    return true;
  });

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <RainEffect />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tasks</Text>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task list */}
        {filtered.length > 0 ? (
          <View style={styles.list}>
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => onNavigate({ name: 'task-detail', taskId: task.id, from: 'tasks' })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="cloud-outline" size={52} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No tasks here</Text>
            <Text style={styles.emptyBody}>Describe what you need on the home tab.</Text>
          </View>
        )}
      </ScrollView>

      <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: spacing.screenMargin },
  title: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(0,122,255,0.25)',
    borderColor: 'rgba(0,122,255,0.5)',
  },
  filterLabel: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.medium,
  },
  filterLabelActive: {
    color: '#fff',
  },
  list: { gap: spacing.sm },
  card: { marginBottom: 0 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeAgo: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.3)',
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardPrompt: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  artifactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  artifactCount: {
    ...typography.bodySm,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
  },
  emptyBody: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },
});
