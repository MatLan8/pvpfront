import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export const createConnection = () => {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:5179/hubs/game")
    .withAutomaticReconnect()
    .build();

  return connection;
};

export const getConnection = () => connection;
