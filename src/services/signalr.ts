import * as signalR from "@microsoft/signalr";

const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL;

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<signalR.HubConnection> | null = null;

export const createConnection = () => {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_URL)
    .withAutomaticReconnect()
    .build();

  return connection;
};

export const getConnection = () => connection;

export const startConnection = async () => {
  const conn = createConnection();

  if (conn.state === signalR.HubConnectionState.Connected) {
    return conn;
  }

  if (startPromise) {
    return await startPromise;
  }

  startPromise = (async () => {
    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start();
    } else {
      while (conn.state !== signalR.HubConnectionState.Connected) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return conn;
  })();

  try {
    return await startPromise;
  } finally {
    startPromise = null;
  }
};
