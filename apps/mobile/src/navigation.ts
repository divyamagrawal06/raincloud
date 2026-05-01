export type Route =
  | { name: 'home' }
  | { name: 'tasks' }
  | { name: 'task-detail'; taskId: string }
  | { name: 'notifications' }
  | { name: 'profile' };

export function tabIndexForRoute(route: Route): number {
  switch (route.name) {
    case 'home': return 0;
    case 'tasks': return 1;
    case 'task-detail': return 1;
    case 'notifications': return 2;
    case 'profile': return 3;
  }
}

export const TAB_ROUTES: Route['name'][] = ['home', 'tasks', 'notifications', 'profile'];
