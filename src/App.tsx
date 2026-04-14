import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import JoinSessionPage from "./pages/JoinSession/JoinSessionPage";
import WaitingRoomPage from "./pages/WaitingRoom/WaitingRoomPage";
import ConnectionsGamePage from "./games/Connections/ConnectionsGamePage";
import RegisterPage from "./pages/Register/RegisterPage";
import LoginPage from "./pages/Login/LoginPage";
import PlayerReportPage from "./pages/PlayerReport/PlayerReportPage";
import StartSessionPage from "./pages/StartSession/StartSessionPage";
import TeamReportPage from "./pages/TeamReportPage/TeamReportPage";
import MainPage from "./pages/MainPage/MainPage";

import LasersGamePage from "./games/Lasers/LasersGamePage";
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<JoinSessionPage />} />
        <Route
          path="/waiting-room/:sessionCode"
          element={<WaitingRoomPage />}
        />
        <Route path="/game/:sessionCode" element={<LasersGamePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/report" element={<PlayerReportPage />} />
        <Route path="/team-report" element={<TeamReportPage />} />
        <Route path="/start-session" element={<StartSessionPage />} />
        <Route path="/mainpage" element={<MainPage />} />
      </Routes>
      <ToastContainer
        position="top-center"
        autoClose={2200}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover={false}
        theme="dark"
      />
    </>
  );
}

export default App;
