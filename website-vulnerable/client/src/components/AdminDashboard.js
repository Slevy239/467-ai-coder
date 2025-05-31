import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from '../axios';
import Navbar from './Navbar';
import './Todo.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = token ? jwtDecode(token) : null;
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !isAdmin) {
      navigate('/');
    } else {
      fetchUsers();
    }
  }, [token, isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load user list.');
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`/delete-user/${id}`);
      fetchUsers(); // refresh list
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Delete failed.');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="todo-container">
        <div className="todo-header">
          <h2>Admin Dashboard</h2>
        </div>

        {error && <p className="error-message">{error}</p>}

        <ul className="todo-list">
          {users.map(user => (
            <li key={user.id}>
              {user.username}
              <button className="delete" onClick={() => deleteUser(user.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AdminDashboard;
