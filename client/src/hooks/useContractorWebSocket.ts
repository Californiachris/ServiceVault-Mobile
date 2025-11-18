import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WorkerCheckInEvent {
  type: 'worker_checkin';
  workerId: string;
  workerName: string;
  location?: string;
  timestamp: string;
}

interface WorkerCheckOutEvent {
  type: 'worker_checkout';
  workerId: string;
  workerName: string;
  location?: string;
  timestamp: string;
  hoursWorked: string;
}

type WebSocketEvent = WorkerCheckInEvent | WorkerCheckOutEvent;

interface UseContractorWebSocketOptions {
  onWorkerCheckIn?: (event: WorkerCheckInEvent) => void;
  onWorkerCheckOut?: (event: WorkerCheckOutEvent) => void;
  enabled?: boolean;
}

export function useContractorWebSocket(options: UseContractorWebSocketOptions = {}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { onWorkerCheckIn, onWorkerCheckOut, enabled = true } = options;

  const connect = useCallback(() => {
    if (!user?.id || !enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent | { type: 'auth_success' } = JSON.parse(event.data);

          if (data.type === 'auth_success') {
            console.log('WebSocket authenticated');
            return;
          }

          if (data.type === 'worker_checkin' && onWorkerCheckIn) {
            onWorkerCheckIn(data as WorkerCheckInEvent);
          } else if (data.type === 'worker_checkout' && onWorkerCheckOut) {
            onWorkerCheckOut(data as WorkerCheckOutEvent);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;

        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [user?.id, enabled, onWorkerCheckIn, onWorkerCheckOut]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
