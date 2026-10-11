"use client";

import { env } from "@/env";
import { authClient } from "@/server/better-auth/client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;
  const errorReconnectDelay = 5000;
  const isReconnecting = useRef(false);

  const { data: session } = authClient.useSession();

  const connect = useCallback(() => {
    if (
      socket?.readyState === WebSocket.OPEN ||
      isConnected ||
      isReconnecting.current
    )
      return;

    if (!session?.user?.id) return;
    try {
      const userSecret = (session.user as { secret?: string }).secret ?? "";
      const url =
        env.NEXT_PUBLIC_WEBSOCKET_URL +
        `/${session.user.id}/${userSecret}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setSocket(ws);
        reconnectAttempts.current = 0;
        isReconnecting.current = false;
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
      };

      ws.onclose = async (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setSocket(null);

        // Attempt to reconnect if not a normal closure
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts &&
          !isReconnecting.current
        ) {
          reconnectAttempts.current += 1;
          console.log(
            `Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.log("WebSocket err:", error);
        setIsConnected(false);
        if (!isReconnecting.current) {
          isReconnecting.current = true;
          setTimeout(() => {
            isReconnecting.current = false;
            connect();
          }, errorReconnectDelay);
        }
      };
    } catch (error) {
      console.log("Failed to create WebSocket connection:", error);
    }
  }, [socket, session]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isReconnecting.current = false;
    if (socket) {
      socket.close(1000, "Client disconnect");
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(message);
      } else {
        console.warn("WebSocket is not connected. Message not sent:", message);
      }
    },
    [socket],
  );

  useEffect(() => {
    // Auto-connect on mount
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
