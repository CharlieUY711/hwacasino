import { Outlet, Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#111", color: "#fff", padding: 20 }}>
        <h2>ADMIN PANEL</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/admin">Overview</Link>
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/codes">Codes</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

