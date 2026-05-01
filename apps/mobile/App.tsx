import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import type { Task } from '@raincloud/domain';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { type Route, TAB_ROUTES, tabIndexForRoute } from './src/navigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { PlanReviewScreen } from './src/screens/PlanReviewScreen';
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
  const [liveTasks, setLiveTasks] = useState<Task[]>([]);

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

  function handleTaskUpdate(task: Task) {
    setLiveTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = task;
        return updated;
      }
      return [task, ...prev];
    });
  }

  function handleTaskApproved(taskId: string, _runId: string) {
    setRoute({ name: 'task-detail', taskId, from: 'plan-review' });
  }

  return (
    <SafeAreaProvider>
      {route.name === 'home' && (
        <HomeScreen
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onNavigate={handleNavigate}
        />
      )}
      {route.name === 'plan-review' && (
        <PlanReviewScreen
          taskId={route.taskId}
          planResult={route.planResult}
          onApproved={handleTaskApproved}
          onBack={() => setRoute({ name: 'home' })}
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      )}
      {route.name === 'tasks' && (
        <TasksScreen
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onNavigate={handleNavigate}
          liveTasks={liveTasks}
        />
      )}
      {route.name === 'task-detail' && (
        <TaskDetailScreen
          taskId={route.taskId}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onBack={() => setRoute(route.from === 'notifications' ? { name: 'notifications' } : { name: 'tasks' })}
          onTaskUpdate={handleTaskUpdate}
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
