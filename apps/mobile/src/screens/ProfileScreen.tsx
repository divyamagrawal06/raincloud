import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { GlassCard } from '../components/GlassCard';
import { RainEffect } from '../components/RainEffect';
import { MOCK_TASKS } from '../fixtures';
import { colors, fonts, radii, spacing, typography } from '../theme';

const CREDITS_USED = 34;
const CREDITS_TOTAL = 100;

type IoniconName = keyof typeof Ionicons.glyphMap;

const SETTINGS: { icon: IoniconName; label: string; value?: string }[] = [
  { icon: 'notifications-outline', label: 'Push notifications', value: 'On' },
  { icon: 'card-outline',          label: 'Credits & billing',  value: `${CREDITS_TOTAL - CREDITS_USED} left` },
  { icon: 'shield-checkmark-outline', label: 'Privacy',         value: '' },
  { icon: 'help-circle-outline',   label: 'Help & feedback',    value: '' },
  { icon: 'information-circle-outline', label: 'About Raincloud', value: '0.1.0' },
];

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type Props = {
  activeTab: number;
  onTabPress: (i: number) => void;
};

export function ProfileScreen({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();

  const succeeded = MOCK_TASKS.filter((t) => t.status === 'succeeded').length;
  const running   = MOCK_TASKS.filter((t) => t.status === 'running').length;
  const failed    = MOCK_TASKS.filter((t) => t.status === 'failed').length;

  const creditPct = (CREDITS_USED / CREDITS_TOTAL) * 100;

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <RainEffect />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + name */}
        <GlassCard style={styles.section}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>D</Text>
            </View>
            <View>
              <Text style={styles.userName}>Divya Agrawal</Text>
              <Text style={styles.userEmail}>ludicrouslytrue@gmail.com</Text>
            </View>
          </View>
        </GlassCard>

        {/* Credits */}
        <GlassCard style={styles.section}>
          <View style={styles.creditsHeader}>
            <Text style={styles.creditsTitle}>Credits</Text>
            <Text style={styles.creditsCount}>
              <Text style={styles.creditsUsed}>{CREDITS_USED}</Text>
              <Text style={styles.creditsOf}> / {CREDITS_TOTAL}</Text>
            </Text>
          </View>
          <View style={styles.creditBar}>
            <View style={[styles.creditFill, { width: `${creditPct}%` as `${number}%` }]} />
          </View>
          <Text style={styles.creditsRemaining}>
            {CREDITS_TOTAL - CREDITS_USED} credits remaining
          </Text>
        </GlassCard>

        {/* Task stats */}
        <GlassCard style={styles.section}>
          <Text style={styles.statsHeading}>Task history</Text>
          <View style={styles.statsRow}>
            <StatCell value={String(succeeded)} label="Completed" />
            <View style={styles.statDivider} />
            <StatCell value={String(running)} label="Running" />
            <View style={styles.statDivider} />
            <StatCell value={String(failed)} label="Failed" />
            <View style={styles.statDivider} />
            <StatCell value={String(MOCK_TASKS.length)} label="Total" />
          </View>
        </GlassCard>

        {/* Settings */}
        <GlassCard style={styles.section}>
          {SETTINGS.map((s, i) => (
            <View key={s.label}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.65}>
                <Ionicons name={s.icon} size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.settingLabel}>{s.label}</Text>
                <View style={styles.settingRight}>
                  {s.value ? <Text style={styles.settingValue}>{s.value}</Text> : null}
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </GlassCard>

        <TouchableOpacity style={styles.signOut} activeOpacity={0.7}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
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
  section: { marginBottom: spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,122,255,0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,122,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.bold, fontSize: 22, color: '#fff' },
  userName: { fontFamily: fonts.semiBold, fontSize: 17, color: '#fff', letterSpacing: -0.2 },
  userEmail: { ...typography.bodySm, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  creditsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  creditsTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: '#fff' },
  creditsCount: {},
  creditsUsed: { fontFamily: fonts.bold, fontSize: 18, color: '#fff' },
  creditsOf: { fontFamily: fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  creditBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  creditFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: radii.full,
  },
  creditsRemaining: { ...typography.bodySm, color: 'rgba(255,255,255,0.35)' },
  statsHeading: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  statLabel: { ...typography.labelCaps, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 2 },
  statDivider: { width: 0.5, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
  },
  settingLabel: { ...typography.bodyLg, color: '#fff', flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { ...typography.bodySm, color: 'rgba(255,255,255,0.35)' },
  signOut: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  signOutLabel: { ...typography.bodyLg, color: '#f87171' },
});
