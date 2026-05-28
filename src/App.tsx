import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WaitingRoomPage from "./pages/WaitingRoom/WaitingRoomPage";
import RegisterPage from "./pages/Register/RegisterPage";
import LoginPage from "./pages/Login/LoginPage";
import PlayerReportPage from "./pages/PlayerReport/PlayerReportPage";
import StartSessionPage from "./pages/StartSession/StartSessionPage";
import TeamReportPage from "./pages/TeamReportPage/TeamReportPage";
import MainPage from "./pages/MainPage/MainPage";

import CreditsPage from "./pages/BuyCredits/BuyCreditsPage";
import ReportsForLeader from "./pages/TeamReportPage/ReportsForLeaderPage";

import GameSessionRouter from "./games/GameSessionRouter";
import BulkSessionsPage from "./pages/BulkSessions/Bulksessionspage";
function App() {
  return (
    <>
      <Routes>
        <Route
          path="/waiting-room/:sessionCode"
          element={<WaitingRoomPage />}
        />
        <Route path="/game/:sessionCode" element={<GameSessionRouter />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/report" element={<PlayerReportPage />} />
        <Route path="/team-report" element={<TeamReportPage />} />
        <Route path="/start-session" element={<StartSessionPage />} />
        <Route path="/" element={<MainPage />} />
        <Route path="/buy" element={<CreditsPage />} />
        <Route path="/report/:sessionCode" element={<ReportsForLeader />} />
        <Route path="/bulk-sessions" element={<BulkSessionsPage />} />
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
