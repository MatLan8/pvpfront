import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import "./styles/global.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof Error) {
        console.log("Something went wrong: ${error.message}");
      }
    },
  }),
});

// Debug helper - exposes jumpToGame globally for testing
// Usage in console: window.jumpToGame("SESSION_CODE", 2)
import { startConnection } from "./services/signalr";
(window as unknown as { jumpToGame: (code: string, index: number) => Promise<void> }).jumpToGame = async (code: string, index: number) => {
  try {
    const conn = await startConnection();
    await conn.invoke("JumpToGame", code, index);
    console.log("Jumped to game " + (index + 1));
  } catch (err) {
    console.error("JumpToGame failed:", err);
    alert("JumpToGame error: " + (err as Error).message);
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

