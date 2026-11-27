import type { RouteObject } from 'react-router';
import { AgentDisputePage } from './AgentDisputePage';
import { AgentQueuePage } from './AgentQueuePage';

export const agentRoutes: RouteObject[] = [
  { path: 'agent', element: <AgentQueuePage /> },
  { path: 'agent/disputes/:id', element: <AgentDisputePage /> },
];
