import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axios';
import './Login.css'; // Import the custom CSS file

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await axios.post('/login', { username, password });

      // Save basic session info directly
      localStorage.setItem('user_id', response.data.id);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('role', response.data.role);

      // Navigate based on role
      navigate(response.data.role === 'admin' ? '/admin' : '/todo');
    } catch (err) {
      if (err.response?.status === 401) {
        setErrorMsg('Invalid username or password');
      } else {
        setErrorMsg('Server error. Please try again later.');
      }
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <a href="/register">Don't have an account? Register</a>
      </div>
    </div>
  );
}

export default Login;
