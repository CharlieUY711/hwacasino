import { useEffect, useState } from 'react';

export default function Overview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/admin/overview')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div style={{ color: 'white' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
      <Stat label='Users' value={data.users} />
      <Stat label='Redemptions' value={data.redemptions} />
      <Stat label='Total Chips' value={data.balance} />
      <Stat label='Active Codes' value={data.active_codes} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#111', padding: 20, borderRadius: 10 }}>
      <p>{label}</p>
      <h2>{value}</h2>
    </div>
  );
}

