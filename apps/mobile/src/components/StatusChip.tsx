import type { TaskStatus } from '@raincloud/domain';
import { StyleSheet, Text, View } from 'react-native';
import { radii, typography } from '../theme';

const STATUS_META: Record<TaskStatus, { label: string; bg: string; fg: string }> = {
  draft:        { label: 'Draft',        bg: 'rgba(139,144,160,0.2)', fg: '#8b90a0' },
  clarifying:   { label: 'Clarifying',   bg: 'rgba(173,198,255,0.2)', fg: '#adc6ff' },
  plan_review:  { label: 'Review plan',  bg: 'rgba(251,191,36,0.2)',  fg: '#fbbf24' },
  queued:       { label: 'Queued',       bg: 'rgba(167,139,250,0.2)', fg: '#a78bfa' },
  planning:     { label: 'Planning',     bg: 'rgba(167,139,250,0.2)', fg: '#a78bfa' },
  running:      { label: 'Running',      bg: 'rgba(0,122,255,0.2)',   fg: '#007AFF' },
  needs_input:  { label: 'Needs input',  bg: 'rgba(251,146,60,0.2)',  fg: '#fb923c' },
  succeeded:    { label: 'Done',         bg: 'rgba(52,211,153,0.2)',  fg: '#34d399' },
  failed:       { label: 'Failed',       bg: 'rgba(248,113,113,0.2)', fg: '#f87171' },
  canceled:     { label: 'Canceled',     bg: 'rgba(107,114,128,0.2)', fg: '#6b7280' },
};

type Props = { status: TaskStatus };

export function StatusChip({ status }: Props) {
  const { label, bg, fg } = STATUS_META[status];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  label: {
    ...typography.labelCaps,
    textTransform: 'uppercase',
  },
});
