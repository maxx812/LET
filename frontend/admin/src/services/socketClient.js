import { io } from "socket.io-client";

let socket = null;

function getSocketOptions() {
  return {
    autoConnect: false,
    transports: ["websocket"],
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
    timeout: 5000,
    auth: {
      token: localStorage.getItem("admin_token"),
    },
  };
}

export function connectAdminSocket() {
  if (!socket) {
    const configuredApiBaseUrl = import.meta.env.VITE_API_URL;
    const url = import.meta.env.VITE_SOCKET_URL || configuredApiBaseUrl;
    const socketOptions = getSocketOptions();
    socket = url ? io(url, socketOptions) : io(socketOptions);
  }

  socket.auth = {
    token: localStorage.getItem("admin_token"),
  };

  if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
}

export function refreshAdminSocketSession() {
  const client = connectAdminSocket();
  client.disconnect();
  client.connect();
  return client;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
