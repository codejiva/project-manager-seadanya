// frontend/src/components/KanbanBoard.jsx

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import ConfirmationModal from './ConfirmationModal';

const API_URL = '';

// Komponen Kolom Internal untuk kerapian kode
const Column = ({ title, tasks }) => {
    const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-slate-700 pb-2">
                {title === 'Belum Dikerjakan' && '📝'}
                {title === 'Lagi Dikerjakan' && '⚙️'}
                {title === 'Selesai' && '✅'}
                {title}
                <span className="text-sm font-normal bg-slate-700 text-slate-400 rounded-full px-2 py-0.5">{tasks.length}</span>
            </h3>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 min-h-[100px]">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

const KanbanBoard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('priority');
    const [filterByTeam, setFilterByTeam] = useState('all');
    const [confirmation, setConfirmation] = useState({ isOpen: false, message: '', onConfirm: () => {} });

    const sensors = useSensors(useSensor(PointerSensor));

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/tasks`, {
                headers: { 'x-user-role': user.role, 'x-user-team': user.team }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Gagal mengambil data task:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, [user]);

    const handleCreateTask = async (taskData) => {
        try {
            await axios.post(`${API_URL}/api/tasks`, { ...taskData, requester_id: user.id });
            setIsModalOpen(false);
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.error || "Gagal membuat task baru");
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/tasks/${taskId}/status`, { status: newStatus, userRole: user.role });
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.error || "Gagal update status");
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const task = tasks.find(t => t.id === active.id);
        const sourceColumn = task.status;
        const destinationColumn = over.id;

        if (sourceColumn === destinationColumn) return;

        let confirmationMessage = '';
        let isValidMove = false;

        if (user.role === 'DEVELOPER' && sourceColumn === 'Belum Dikerjakan' && destinationColumn === 'Lagi Dikerjakan') {
            confirmationMessage = `Yakin mau mulai mengerjakan task "${task.title}"?`;
            isValidMove = true;
        }

        if (user.role === 'TEAM' && sourceColumn === 'Lagi Dikerjakan' && destinationColumn === 'Selesai') {
            confirmationMessage = `Yakin task "${task.title}" sudah selesai dengan benar?`;
            isValidMove = true;
        }

        if (isValidMove) {
            setConfirmation({
                isOpen: true,
                message: confirmationMessage,
                onConfirm: () => {
                    handleStatusChange(task.id, destinationColumn);
                    setConfirmation({ isOpen: false });
                },
            });
        }
    };

    const displayedTasks = useMemo(() => {
        let filteredTasks = [...tasks];
        if (user.role === 'DEVELOPER' && filterByTeam !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.team === filterByTeam);
        }
        switch (sortBy) {
            case 'priority': filteredTasks.sort((a, b) => b.priority - a.priority); break;
            case 'newest': filteredTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
            case 'oldest': filteredTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
            default: break;
        }
        return filteredTasks;
    }, [tasks, sortBy, filterByTeam, user.role]);

    const columns = {
        "Belum Dikerjakan": displayedTasks.filter(t => t.status === 'Belum Dikerjakan'),
        "Lagi Dikerjakan": displayedTasks.filter(t => t.status === 'Lagi Dikerjakan'),
        "Selesai": displayedTasks.filter(t => t.status === 'Selesai'),
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    {user.role === 'DEVELOPER' && (
                        <div>
                            <label htmlFor="filter" className="text-sm mr-2 text-slate-400">Filter Tim:</label>
                            <select id="filter" value={filterByTeam} onChange={e => setFilterByTeam(e.target.value)} className="bg-slate-700 p-2 rounded text-white border border-slate-600">
                                <option value="all">Semua Tim</option>
                                <option value="TaLas">TaLas</option>
                                <option value="MisRo">MisRo</option>
                                <option value="MarTaBaK">MarTaBaK</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label htmlFor="sort" className="text-sm mr-2 text-slate-400">Urutkan:</label>
                        <select id="sort" value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-700 p-2 rounded text-white border border-slate-600">
                            <option value="priority">Prioritas</option>
                            <option value="newest">Paling Baru</option>
                            <option value="oldest">Paling Lama</option>
                        </select>
                    </div>
                </div>
                {user.role === 'TEAM' && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">
                        + Buat Task Baru
                    </button>
                )}
            </div>

            <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateTask} userTeam={user.team} />
            <ConfirmationModal 
                isOpen={confirmation.isOpen} 
                message={confirmation.message} 
                onConfirm={confirmation.onConfirm} 
                onCancel={() => setConfirmation({ isOpen: false })} 
            />
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {loading ? <p>Lagi ngambil data...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(columns).map(([status, tasksInColumn]) => (
                            <Column key={status} id={status} title={status} tasks={tasksInColumn} />
                        ))}
                    </div>
                )}
            </DndContext>
        </div>
    );
};

export default KanbanBoard;