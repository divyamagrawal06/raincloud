import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { type Route, TAB_ROUTES, tabIndexForRoute } from './src/navigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [route, setRoute] = useState<Route>({ name: 'home' });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const activeTab = tabIndexForRoute(route);

  function handleTabPress(index: number) {
    const name = TAB_ROUTES[index];
    if (name === 'home') setRoute({ name: 'home' });
    else if (name === 'tasks') setRoute({ name: 'tasks' });
    else if (name === 'notifications') setRoute({ name: 'notifications' });
    else setRoute({ name: 'profile' });
  }

  function handleNavigate(next: Route) {
    setRoute(next);
  }

  return (
    <SafeAreaProvider>
      {route.name === 'home' && (
        <HomeScreen activeTab={activeTab} onTabPress={handleTabPress} />
      )}
      {route.name === 'tasks' && (
        <TasksScreen activeTab={activeTab} onTabPress={handleTabPress} onNavigate={handleNavigate} />
      )}
      {route.name === 'task-detail' && (
        <TaskDetailScreen
          taskId={route.taskId}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onBack={() => setRoute(route.from === 'notifications' ? { name: 'notifications' } : { name: 'tasks' })}
        />
      )}
      {route.name === 'notifications' && (
        <NotificationsScreen activeTab={activeTab} onTabPress={handleTabPress} onNavigate={handleNavigate} />
      )}
      {route.name === 'profile' && (
        <ProfileScreen activeTab={activeTab} onTabPress={handleTabPress} />
      )}
    </SafeAreaProvider>
  );
}
