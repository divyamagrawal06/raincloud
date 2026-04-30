import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
  onSend: (text: string) => void;
};

export function TaskComposerCard({ onSend }: Props) {
  const [text, setText] = useState('');

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.innerGlow} pointerEvents="none" />

      {/* Model picker */}
      <View style={styles.modelRow}>
        <TouchableOpacity style={styles.modelPill} activeOpacity={0.7}>
          <Text style={styles.modelLabel}>GPT-4 Omni</Text>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {/* Textarea */}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask Raincloud anything..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Action row */}
      <View style={styles.actionRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
          <Text style={styles.sendLabel}>Send</Text>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 0,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: spacing.cardPadding,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // subtle top-left corner light leak
    borderRadius: 40,
  },
  modelRow: {
    marginBottom: spacing.md,
  },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modelLabel: {
    ...typography.bodySm,
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    minHeight: 100,
    padding: 0,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryAction,
    borderRadius: radii.full,
    paddingHorizontal: 20,
    height: 44,
    shadowColor: colors.primaryAction,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  sendLabel: {
    ...typography.bodySm,
    color: '#fff',
    fontWeight: '600',
  },
});
