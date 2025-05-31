import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://four67-ai-coder-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
