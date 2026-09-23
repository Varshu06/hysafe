import { io, Socket } from "socket.io-client";
import { storage } from "@utils/storage";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "http://localhost:5000";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    const token = storage.getToken();

    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("✅ Admin Socket Connected");
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Admin Socket Disconnected");
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }
}

export const socketService = new SocketService();