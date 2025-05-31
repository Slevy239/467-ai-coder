import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Todo from './components/Todo';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : '/todo'} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/todo" element={<Todo />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;