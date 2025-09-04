// frontend/src/components/KanbanBoard.jsx

import { useState, useEffect, useMemo } from 'react'; // Tambahkan useMemo
import axios from 'axios';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';

const API_URL = '';

const KanbanBoard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- BARU: State untuk sort & filter ---
    const [sortBy, setSortBy] = useState('priority'); // 'priority', 'newest', 'oldest'
    const [filterByTeam, setFilterByTeam] = useState('all'); // 'all', 'TaLas', 'MisRo', 'MarTaBaK'
    // --- AKHIR STATE BARU ---

    const fetchTasks = async () => {
        // ... (fungsi fetchTasks tetap sama)
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/tasks`, {
                headers: {
                    'x-user-role': user.role,
                    'x-user-team': user.team,
                }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Gagal mengambil data task:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user]);

    // ... (fungsi handleStatusChange & handleCreateTask tetap sama)
    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/tasks/${taskId}/status`,
                { status: newStatus, userRole: user.role },
            );
            fetchTasks(); 
        } catch (error) {
            alert(error.response?.data?.error || "Gagal update status");
            console.error("Error updating status:", error);
        }
    };

    const handleCreateTask = async (taskData) => {
        try {
            await axios.post(`${API_URL}/api/tasks`, {
                ...taskData,
                requester_id: user.id
            });
            setIsModalOpen(false);
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.error || "Gagal membuat task baru");
            console.error("Error creating task:", error);
        }
    };

    // --- BARU: Logika untuk memfilter dan mengurutkan task ---
    const displayedTasks = useMemo(() => {
        let filteredTasks = [...tasks];

        // 1. Terapkan filter (hanya untuk developer)
        if (user.role === 'DEVELOPER' && filterByTeam !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.team === filterByTeam);
        }

        // 2. Terapkan sortir
        switch (sortBy) {
            case 'priority':
                filteredTasks.sort((a, b) => b.priority - a.priority);
                break;
            case 'newest':
                filteredTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                filteredTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            default:
                break;
        }

        return filteredTasks;
    }, [tasks, sortBy, filterByTeam, user.role]);
    // --- AKHIR LOGIKA BARU ---

    // Gunakan `displayedTasks` bukan `tasks` untuk membuat kolom
    const columns = {
        "Belum Dikerjakan": displayedTasks.filter(t => t.status === 'Belum Dikerjakan'),
        "Lagi Dikerjakan": displayedTasks.filter(t => t.status === 'Lagi Dikerjakan'),
        "Selesai": displayedTasks.filter(t => t.status === 'Selesai'),
    };

    return (
        <div>
            {/* --- BARU: Kumpulan Tombol Kontrol (Filter, Sort, Buat Task) --- */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    {/* Filter (hanya untuk developer) */}
                    {user.role === 'DEVELOPER' && (
                        <div>
                            <label htmlFor="filter" className="text-sm mr-2">Filter Tim:</label>
                            <select id="filter" value={filterByTeam} onChange={e => setFilterByTeam(e.target.value)} className="bg-slate-700 p-2 rounded">
                                <option value="all">Semua Tim</option>
                                <option value="TaLas">TaLas</option>
                                <option value="MisRo">MisRo</option>
                                <option value="MarTaBaK">MarTaBaK</option>
                            </select>
                        </div>
                    )}
                    {/* Sort */}
                    <div>
                        <label htmlFor="sort" className="text-sm mr-2">Urutkan:</label>
                        <select id="sort" value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-700 p-2 rounded">
                            <option value="priority">Prioritas</option>
                            <option value="newest">Paling Baru</option>
                            <option value="oldest">Paling Lama</option>
                        </select>
                    </div>
                </div>

                {/* Tombol Buat Task (hanya untuk tim) */}
                {user.role === 'TEAM' && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">
                        + Buat Task Baru
                    </button>
                )}
            </div>
            {/* --- AKHIR BAGIAN BARU --- */}

            <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateTask} userTeam={user.team} />
            
            {loading ? <p>Lagi ngambil data...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(columns).map(([status, tasksInColumn]) => (
                        <div key={status} className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="text-xl font-bold mb-4 border-b-2 border-slate-700 pb-2">{status} ({tasksInColumn.length})</h3>
                            <div className="space-y-4">
                                {tasksInColumn.map(task => (
                                    <TaskCard key={task.id} task={task} user={user} onStatusChange={handleStatusChange} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KanbanBoard;