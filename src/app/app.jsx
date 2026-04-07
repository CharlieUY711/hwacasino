import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// IMPORTS EXISTENTES (dejá los tuyos si tienen otros nombres)
import LobbyPage from "./pages/LobbyPage";
import LoginPage from "./pages/LoginPage";

// NUEVO IMPORT (dashboard)
import Dashboard from "./admin/Dashboard";

export default function App() {
  return (
    <Router>
      <Routes>

        {/* RUTAS EXISTENTES */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/lobby" element={<LobbyPage />} />

        {/* NUEVA RUTA ADMIN */}
        <Route path="/admin" element={<Dashboard />} />

      </Routes>
    </Router>
  );
}
