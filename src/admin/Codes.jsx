import { useEffect, useState } from 'react';

export default function Codes() {
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    fetch('/admin/codes')
      .then(res => res.json())
      .then(setCodes);
  }, []);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Codes</h2>

      <table style={{ width: '100%', marginTop: 10 }}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(c => (
            <tr key={c.code}>
              <td>{c.code}</td>
              <td>{c.reward_type}</td>
              <td>{c.reward_value}</td>
              <td>{c.used_count}/{c.max_uses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
