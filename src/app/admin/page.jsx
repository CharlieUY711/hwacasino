'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [ledger, setLedger] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/ledger');
      const data = await res.json();
      setLedger(data);
    }

    load();
  }, []);

  return (
    <div>
      <h1>CASINO ADMIN</h1>

      <h2>Ledger</h2>
      <pre>{JSON.stringify(ledger, null, 2)}</pre>
    </div>
  );
}

