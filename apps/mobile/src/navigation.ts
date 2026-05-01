import type { PlanResult } from './api/raincloudClient';

export type Route =
  | { name: 'home' }
  | { name: 'tasks' }
  | { name: 'task-detail'; taskId: string; from: 'tasks' | 'notifications' | 'plan-review' }
  | { name: 'notifications' }
  | { name: 'profile' }
  | { name: 'plan-review'; taskId: string; planResult: PlanResult & { status: 'plan_review' } };

export function tabIndexForRoute(route: Route): number {
  switch (route.name) {
    case 'home': return 0;
    case 'tasks': return 1;
    case 'task-detail': return 1;
    case 'notifications': return 2;
    case 'profile': return 3;
    case 'plan-review': return 0;
  }
}

export const TAB_ROUTES: Route['name'][] = ['home', 'tasks', 'notifications', 'profile'];
