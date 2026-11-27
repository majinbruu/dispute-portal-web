import type { RouteObject } from 'react-router';
import { AgentQueuePage } from './AgentQueuePage';

export const agentRoutes: RouteObject[] = [{ path: 'agent', element: <AgentQueuePage /> }];
