import { Route, Routes } from "react-router-dom";
import JoinSessionPage from "./pages/JoinSession/JoinSessionPage";
import WaitingRoomPage from "./pages/WaitingRoom/WaitingRoomPage";
import ConnectionsGamePage from "./games/Connections/ConnectionsGamePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinSessionPage />} />
      <Route path="/waiting-room/:sessionCode" element={<WaitingRoomPage />} />
      <Route path="/game/:sessionCode" element={<ConnectionsGamePage />} />
    </Routes>
  );
}

export default App;
