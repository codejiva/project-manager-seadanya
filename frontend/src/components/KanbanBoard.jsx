// frontend/src/components/KanbanBoard.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal'; // Kita akan buat file ini

const API_URL = '';

const KanbanBoard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // State untuk modal

    const fetchTasks = async () => {
        // ... (fungsi fetchTasks tetap sama, tidak perlu diubah)
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
    
    // ... (fungsi handleStatusChange tetap sama)
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
            // Kirim data task baru ke backend
            await axios.post(`${API_URL}/api/tasks`, {
                ...taskData,
                requester_id: user.id // Tambahkan ID user yang request
            });
            setIsModalOpen(false); // Tutup modal
            fetchTasks(); // Ambil ulang data task biar yang baru muncul
        } catch (error) {
            alert(error.response?.data?.error || "Gagal membuat task baru");
            console.error("Error creating task:", error);
        }
    };

    const columns = {
        "Belum Dikerjakan": tasks.filter(t => t.status === 'Belum Dikerjakan'),
        "Lagi Dikerjakan": tasks.filter(t => t.status === 'Lagi Dikerjakan'),
        "Selesai": tasks.filter(t => t.status === 'Selesai'),
    };

    return (
        <div>
            {/* --- BAGIAN BARU DIMULAI DARI SINI --- */}
            <div className="flex justify-end mb-6">
                {user.role === 'TEAM' && ( // Hanya tim yang bisa buat task
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded"
                    >
                        + Buat Task Baru
                    </button>
                )}
            </div>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateTask}
                userTeam={user.team}
            />
            {/* --- BAGIAN BARU SELESAI DI SINI --- */}

            {loading ? <p>Lagi ngambil data...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(columns).map(([status, tasksInColumn]) => (
                        <div key={status} className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="text-xl font-bold mb-4 border-b-2 border-slate-700 pb-2">{status} ({tasksInColumn.length})</h3>
                            <div className="space-y-4">
                                {tasksInColumn.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        user={user}
                                        onStatusChange={handleStatusChange}
                                    />
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