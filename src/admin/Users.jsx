import { useEffect, useState } from 'react';

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/admin/users')
      .then(res => res.json())
      .then(setUsers);
  }, []);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Users</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Balance</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.balance}</td>
              <td>{u.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
