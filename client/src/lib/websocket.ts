import { useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(url: string, onMessage: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}${url}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WebSocket] Connected");
          setIsConnected(true);
          
          // Send auth message (in demo mode, use demo user)
          ws.send(JSON.stringify({
            type: "auth",
            userId: "demo-user-public"
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage(message);
          } catch (error) {
            console.error("[WebSocket] Failed to parse message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
        };

        ws.onclose = () => {
          console.log("[WebSocket] Disconnected");
          setIsConnected(false);
          wsRef.current = null;
          
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[WebSocket] Reconnecting...");
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error("[WebSocket] Connection failed:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, onMessage]);

  return { isConnected };
}
