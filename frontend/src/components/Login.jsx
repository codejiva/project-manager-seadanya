import { useState } from 'react';
import axios from 'axios';

const API_URL = ''; // URL backend kita

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/login`, { username, password });
      onLogin(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal, coba lagi.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-slate-800 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-6">Login</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className="bg-red-500/20 text-red-400 p-3 rounded mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 p-3 rounded font-bold">Masuk</button>
      </form>
    </div>
  );
};

export default Login;