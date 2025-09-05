import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const TaskDetailModal = ({ task, user, onClose, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ title: task.title, description: task.description, priority: task.priority, due_date: task.due_date });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);

    useEffect(() => {
        if (task.id) {
            const fetchComments = async () => {
                try {
                    setLoadingComments(true);
                    const { data } = await axios.get(`${API_URL}/api/tasks/${task.id}/comments`);
                    setComments(data);
                } catch (error) {
                    console.error("Gagal mengambil komentar", error);
                } finally {
                    setLoadingComments(false);
                }
            };
            fetchComments();
        }
    }, [task.id]);

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(task.id, { ...editData, priority: parseInt(editData.priority, 10) });
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        if (window.confirm(`Yakin mau menghapus task "${task.title}"?`)) {
            onDelete(task.id);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const { data: addedComment } = await axios.post(`${API_URL}/api/tasks/${task.id}/comments`, { content: newComment, user_id: user.id });
            setComments(prev => [...prev, addedComment]);
            setNewComment('');
        } catch {
            alert("Gagal mengirim komentar.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Tidak ada';
        return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-3xl relative h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0">
                    {isEditing ? (
                        <input type="text" name="title" value={editData.title} onChange={handleEditChange} className="text-3xl font-bold bg-slate-700 p-2 rounded w-full mb-2" />
                    ) : (
                        <h2 className="text-3xl font-bold mb-2">{task.title}</h2>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mb-4 pb-4 border-b border-slate-700">
                        <span>Oleh: {task.users?.username || 'N/A'}</span>
                        <span>Tim: {task.team}</span>
                        <span>Deadline: 
                            {isEditing ? (
                                <input type="date" name="due_date" value={editData.due_date?.split('T')[0] || ''} onChange={handleEditChange} className="bg-slate-700 p-1 rounded" />
                            ) : (
                                <span className={new Date(task.due_date) < new Date() && task.status !== 'Selesai' ? 'text-red-400 font-bold' : ''}>{formatDate(task.due_date)}</span>
                            )}
                        </span>
                        <span>Prioritas:
                            {isEditing ? (
                                <select name="priority" value={editData.priority} onChange={handleEditChange} className="bg-slate-700 p-1 rounded">
                                    <option value="3">Tinggi</option>
                                    <option value="2">Sedang</option>
                                    <option value="1">Rendah</option>
                                </select>
                            ) : ( <span>{ {1:'Rendah', 2:'Sedang', 3:'Tinggi'}[task.priority] }</span> )}
                        </span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <h3 className="font-bold mb-2 text-slate-300">Deskripsi</h3>
                    {isEditing ? (
                         <textarea name="description" value={editData.description} onChange={handleEditChange} className="w-full bg-slate-700 p-2 rounded mb-4" rows="5"></textarea>
                    ) : (
                        <p className="text-slate-300 mb-6 whitespace-pre-wrap">{task.description || "Tidak ada deskripsi."}</p>
                    )}
                    
                    <h3 className="font-bold mb-4 text-slate-300">Diskusi</h3>
                    <div className="space-y-4 mb-4">
                        {loadingComments ? <p>Memuat komentar...</p> : comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-800 flex-shrink-0 flex items-center justify-center font-bold text-cyan-300">
                                    {comment.users?.username?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className='bg-slate-700 p-3 rounded-lg rounded-tl-none w-full'>
                                    <p className="font-bold text-sm text-white">{comment.users?.username || 'User'} <span className="text-xs text-slate-500 font-normal ml-2">{new Date(comment.created_at).toLocaleString('id-ID')}</span></p>
                                    <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                         { !loadingComments && comments.length === 0 && <p className="text-slate-500 text-sm">Belum ada diskusi.</p> }
                    </div>
                </div>

                <div className="flex-shrink-0 pt-4 border-t border-slate-700">
                     <form onSubmit={handleAddComment} className="flex gap-4 mb-4">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Tulis komentar..." className="flex-grow bg-slate-700 p-2 rounded border border-slate-600 focus:outline-none focus:border-cyan-500" />
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded font-semibold">Kirim</button>
                    </form>
                    <div className="flex justify-between items-center">
                         {isEditing ? (
                            <div>
                                <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-2 font-semibold">Simpan Perubahan</button>
                                <button onClick={() => setIsEditing(false)} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded">Batal</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold">Edit Task</button>
                        )}
                        {user.role === 'DEVELOPER' && <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold">Hapus Task</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;