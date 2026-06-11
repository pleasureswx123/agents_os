import { io } from 'socket.io-client';

const socketBase = import.meta.env.VITE_SOCKET_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

export function connectRunSocket(runId: string, onEvent: (eventName: string, payload: unknown) => void) {
  const socket = io(`${socketBase}/runs`, {
    transports: ['websocket', 'polling'],
    query: { runId }
  });
  const events = [
    'run.running',
    'run.waiting_for_human_edit',
    'run.failed',
    'run.succeeded',
    'run.control.applied',
    'run.control.rejected',
    'run.exporting',
    'run.exported',
    'node.running',
    'node.succeeded',
    'node.failed'
  ];
  for (const eventName of events) {
    socket.on(eventName, (payload) => onEvent(eventName, payload));
  }
  return socket;
}
