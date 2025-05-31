import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from '../axios';
import Navbar from './Navbar'; // Import the Navbar component
import './Todo.css'; // Import the custom CSS file

function TodoPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = token ? jwtDecode(token) : null;
  const userId = user?.id;
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editXmlMode, setEditXmlMode] = useState(false);
  const [xmlContent, setXmlContent] = useState('');

  const refreshTodos = useCallback(() => {
    if (!userId) return;
    axios.get(`/todos/${userId}`)
      .then(res => setTodos(res.data))
      .catch(err => console.error('Failed to fetch todos:', err));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
    } else {
      refreshTodos();
    }
  }, [token, userId, navigate, refreshTodos]);

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    await axios.post('/todos', {
      content: newTodo
    });
    setNewTodo('');
    refreshTodos();
  };

  // Delete a todo item by ID
  const deleteTodo = async (id) => {
    await axios.delete(`/todos/${id}`);
    refreshTodos();
  };

  // Start editing a todo, initialize edit states including XML content
  const startEditing = (todo) => {
    setEditing(todo.id);
    setEditContent(todo.content);
    setEditXmlMode(false);
    setXmlContent(
      `<todo>\n  <id>${todo.id}</id>\n  <user_id>${todo.user_id}</user_id>\n  <content>${escapeXml(todo.content)}</content>\n</todo>`
    );
  };

  // Escape XML special characters to avoid malformed XML
  const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  // Save todo changes using JSON API (text mode)
  const updateTodo = async () => {
    try {
      await axios.put(`http://localhost:5000/todos/${editing}`, {
        content: editContent
      });
      cancelEditing();
      refreshTodos();
    } catch (err) {
      console.error('Update todo failed:', err);
    }
  };

  // Save todo changes using XML API (XML mode)
  const updateTodoWithXML = async () => {
    try {
      await axios.post('http://localhost:5000/edit-todo-xml', xmlContent, {
        headers: { 'Content-Type': 'application/xml' },
      });
      cancelEditing();
      refreshTodos();
    } catch (err) {
      alert('XML Update Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Cancel editing and reset states
  const cancelEditing = () => {
    setEditing(null);
    setEditContent('');
    setXmlContent('');
    setEditXmlMode(false);
  };

  return (
    <div>
      <Navbar />
      <div className="todo-container">
        <div className="add-todo">
          <input
            type="text"
            placeholder="New task"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <button onClick={addTodo}>Add</button>
        </div>

        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo.id}>
              {editing === todo.id ? (
                <div className="edit-section">
                  <label>
                    <input
                      type="checkbox"
                      checked={editXmlMode}
                      onChange={(e) => setEditXmlMode(e.target.checked)}
                    />{' '}
                    Edit with XML
                  </label>

                  {editXmlMode ? (
                    <>
                      <textarea
                        rows="8"
                        cols="60"
                        value={xmlContent}
                        onChange={(e) => setXmlContent(e.target.value)}
                      />
                      <button onClick={updateTodoWithXML}>Save XML</button>
                    </>
                  ) : (
                    <>
                      <input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <button onClick={updateTodo}>Save</button>
                    </>
                  )}
                  <button onClick={cancelEditing}>Cancel</button>
                </div>
              ) : (
                <>
                  <span>{todo.content}</span>
                  <button onClick={() => startEditing(todo)}>Edit</button>
                  <button className="delete" onClick={() => deleteTodo(todo.id)}>Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TodoPage;
