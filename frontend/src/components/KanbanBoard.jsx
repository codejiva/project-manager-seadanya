import { useState, useEffect } from 'react';
import axios from 'axios';
import TaskCard from './TaskCard';

const API_URL = '';

const KanbanBoard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
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

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/tasks/${taskId}/status`,
                { status: newStatus, userRole: user.role },
            );
            fetchTasks(); // Refresh data setelah update
        } catch (error) {
            alert(error.response?.data?.error || "Gagal update status");
            console.error("Error updating status:", error);
        }
    };

    const columns = {
        "Belum Dikerjakan": tasks.filter(t => t.status === 'Belum Dikerjakan'),
        "Lagi Dikerjakan": tasks.filter(t => t.status === 'Lagi Dikerjakan'),
        "Selesai": tasks.filter(t => t.status === 'Selesai'),
    };

    return (
        <div>
            {/* Nanti di sini bisa tambahin tombol "Buat Task Baru" */}
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