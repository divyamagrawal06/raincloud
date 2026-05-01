import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { BottomTabBar } from '../components/BottomTabBar';
import { GlassCard } from '../components/GlassCard';
import { RainEffect } from '../components/RainEffect';
import { MOCK_NOTIFICATIONS } from '../fixtures';
import type { Route } from '../navigation';
import { colors, fonts, spacing, typography } from '../theme';
import { timeAgo } from '../utils/timeAgo';

type NotifKind = (typeof MOCK_NOTIFICATIONS)[number]['kind'];

type IoniconName = keyof typeof Ionicons.glyphMap;

const KIND_META: Record<NotifKind, { icon: IoniconName; color: string }> = {
  task_succeeded: { icon: 'checkmark-circle',    color: '#34d399' },
  task_failed:    { icon: 'close-circle',        color: '#f87171' },
  task_running:   { icon: 'play-circle',         color: '#007AFF' },
  plan_ready:     { icon: 'clipboard',           color: '#fbbf24' },
};

type Props = {
  activeTab: number;
  onTabPress: (i: number) => void;
  onNavigate: (route: Route) => void;
};

export function NotificationsScreen({ activeTab, onTabPress, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read);

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <RainEffect />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Alerts</Text>
          {unread.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread.length}</Text>
            </View>
          )}
        </View>

        {MOCK_NOTIFICATIONS.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={52} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>All quiet</Text>
            <Text style={styles.emptyBody}>You'll hear from us when a task finishes or needs input.</Text>
          </View>
        ) : (
          <GlassCard style={styles.card}>
            {MOCK_NOTIFICATIONS.map((n, i) => {
              const { icon, color } = KIND_META[n.kind];
              return (
                <View key={n.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.notifRow}
                    onPress={() => n.taskId && onNavigate({ name: 'task-detail', taskId: n.taskId, from: 'notifications' })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <View style={styles.notifBody}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                          {n.title}
                        </Text>
                        {!n.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifText} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </GlassCard>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#fff',
  },
  card: {},
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.cardPadding * -1,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  notifTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  notifTitleUnread: {
    color: '#fff',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#007AFF',
  },
  notifText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 20,
    marginBottom: 4,
  },
  notifTime: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
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
    maxWidth: 260,
  },
});
