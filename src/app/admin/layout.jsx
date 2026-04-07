import Link from 'next/link';

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19', color: '#fff' }}>
      <aside style={{ width: 260, background: '#0f172a', padding: 20 }}>
        <h2>ADMIN PANEL</h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href='/admin'>Dashboard</Link>
          <Link href='/admin/users'>Users</Link>
          <Link href='/admin/codes'>Codes</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 30 }}>
        {children}
      </main>
    </div>
  );
}

