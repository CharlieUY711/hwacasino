import { Routes, Route } from "react-router-dom";

import Dashboard from "./admin/Dashboard";
import Overview from "./admin/Overview";
import Users from "./admin/Users";
import Codes from "./admin/Codes";

import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/lobby" element={<LobbyPage />} />

      <Route path="/admin" element={<Dashboard />}>
        <Route index element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="codes" element={<Codes />} />
      </Route>
    </Routes>
  );
}
