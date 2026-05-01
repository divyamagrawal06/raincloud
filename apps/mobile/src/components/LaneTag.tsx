import type { TaskLane } from '@raincloud/domain';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const LANE_META: Record<TaskLane, { icon: IoniconName; label: string }> = {
  code_pr:          { icon: 'git-branch-outline',    label: 'Code PR' },
  csv_cleanup:      { icon: 'document-text-outline', label: 'CSV' },
  video_processing: { icon: 'videocam-outline',      label: 'Video' },
  audio_generation: { icon: 'musical-notes-outline', label: 'Audio' },
  research_packet:  { icon: 'library-outline',       label: 'Research' },
  file_processing:  { icon: 'folder-outline',        label: 'Files' },
};

type Props = { lane: TaskLane };

export function LaneTag({ lane }: Props) {
  const { icon, label } = LANE_META[lane];
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={12} color={colors.onSurfaceVariant} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
});
