import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme';

type Tab = {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TABS: Tab[] = [
  { icon: 'chatbubble-outline', iconActive: 'chatbubble', label: 'Chat' },
  { icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', label: 'Tasks' },
  { icon: 'notifications-outline', iconActive: 'notifications', label: 'Alerts' },
  { icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

type Props = {
  activeTab: number;
  onTabPress: (index: number) => void;
};

export function BottomTabBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const barHeight = 49 + insets.bottom;

  return (
    <View style={[styles.container, { height: barHeight }]} pointerEvents="box-none">
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.topBorder} pointerEvents="none" />
      <View style={[styles.tabRow, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.tabItem}
              onPress={() => onTabPress(i)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.activeIndicator} />}
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={26}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 1,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: 49,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  activeIndicator: {
    position: 'absolute',
    top: 6,
    width: 32,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primaryAction,
  },
});
