import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { PickedFile } from '../api/raincloudClient';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
  onSend: (text: string, files: PickedFile[]) => void;
  disabled?: boolean;
};

export function TaskComposerCard({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);

  async function handleAttach() {
    if (disabled || selectedFiles.length >= 7) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const merged = [...selectedFiles, ...result.assets];
      setSelectedFiles(merged.slice(0, 7));
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    if (disabled) return;
    if (!text.trim() && selectedFiles.length === 0) return;
    onSend(text.trim(), selectedFiles);
    setText('');
    setSelectedFiles([]);
  }

  const atLimit = selectedFiles.length >= 7;

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
        editable={!disabled}
      />

      {/* Selected files chips */}
      {selectedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.fileChipsScroll}
          contentContainerStyle={styles.fileChipsContent}
        >
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.fileChip}>
              <Ionicons name="document-outline" size={13} color={colors.primary} />
              <Text style={styles.fileChipName} numberOfLines={1}>
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => removeFile(index)} hitSlop={8}>
                <Ionicons name="close" size={13} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action row */}
      <View style={styles.actionRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={[styles.iconBtn, atLimit && styles.iconBtnDisabled]}
            activeOpacity={0.7}
            onPress={handleAttach}
            disabled={atLimit || disabled}
          >
            <Ionicons
              name="attach"
              size={22}
              color={atLimit ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)'}
            />
          </TouchableOpacity>
          {atLimit && (
            <Text style={styles.limitLabel}>7 max</Text>
          )}
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={disabled}
        >
          <Text style={styles.sendLabel}>{disabled ? 'Uploading…' : 'Send'}</Text>
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
  fileChipsScroll: {
    marginBottom: spacing.sm,
  },
  fileChipsContent: {
    gap: 6,
    paddingVertical: 2,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(173,198,255,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(173,198,255,0.25)',
    maxWidth: 180,
  },
  fileChipName: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  limitLabel: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
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
  iconBtnDisabled: {
    opacity: 0.4,
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
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendLabel: {
    ...typography.bodySm,
    color: '#fff',
    fontWeight: '600',
  },
});
