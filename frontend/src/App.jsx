import { useState, useEffect } from 'react';
import KanbanBoard from './components/KanbanBoard';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Cek apakah ada data user di local storage saat pertama kali load
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <header className="p-4 bg-slate-800 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Web Manajemen Proyek Biar Bung Nggak Tinggal Meninggal</h1>
        {user && (
          <div className='flex items-center gap-4'>
            <p>Halo, <span className='font-bold'>{user.username}</span> ({user.team || user.role})</p>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">Logout</button>
          </div>
        )}
      </header>
      <main className="p-4 md:p-8">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <KanbanBoard user={user} />
        )}
      </main>
    </div>
  );
}

export default App;