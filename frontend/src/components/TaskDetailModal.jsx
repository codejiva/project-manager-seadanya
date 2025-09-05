import { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || '';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TaskDetailModal = ({ task, user, onClose, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ title: task.title, description: task.description, priority: task.priority, due_date: task.due_date });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    const isTeamOwner = user.role === 'TEAM' && user.team === task.team;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);
                const [commentsRes, attachmentsRes] = await Promise.all([
                    axios.get(`${API_URL}/api/tasks/${task.id}/comments`),
                    axios.get(`${API_URL}/api/tasks/${task.id}/attachments`)
                ]);
                setComments(commentsRes.data);
                setAttachments(attachmentsRes.data);
            } catch (error) {
                console.error("Gagal mengambil detail task:", error);
            } finally {
                setLoadingData(false);
            }
        };
        if (task.id) fetchData();
    }, [task.id]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        const filePath = `${user.username}/${task.id}-${Date.now()}-${file.name}`;

        try {
            const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
            
            const { data: newAttachment } = await axios.post(`${API_URL}/api/tasks/${task.id}/attachments`, {
                file_name: file.name,
                file_path: publicUrl,
                file_type: file.type,
                file_size: file.size,
                user_id: user.id
            });
            setAttachments(prev => [...prev, newAttachment]);

        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Gagal mengupload file.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachment) => {
        if (window.confirm(`Yakin mau menghapus file "${attachment.file_name}"?`)) {
            try {
                await axios.delete(`${API_URL}/api/attachments/${attachment.id}`);
                setAttachments(prev => prev.filter(att => att.id !== attachment.id));
            } catch {
                alert("Gagal menghapus attachment.");
            }
        }
    };
    
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
            // --- INI BAGIAN YANG DIPERBAIKI (API_GL -> API_URL) ---
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
                    {isEditing ? ( <input type="text" name="title" value={editData.title} onChange={handleEditChange} className="text-3xl font-bold bg-slate-700 p-2 rounded w-full mb-2" />) : (<h2 className="text-3xl font-bold mb-2">{task.title}</h2>)}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mb-4 pb-4 border-b border-slate-700">
                        <span>Oleh: {task.users?.username || 'N/A'}</span>
                        <span>Tim: {task.team}</span>
                        <span>Deadline: {isEditing ? (<input type="date" name="due_date" value={editData.due_date?.split('T')[0] || ''} onChange={handleEditChange} className="bg-slate-700 p-1 rounded" />) : (<span className={new Date(task.due_date) < new Date() && task.status !== 'Selesai' ? 'text-red-400 font-bold' : ''}>{formatDate(task.due_date)}</span>)}</span>
                        <span>Prioritas: {isEditing ? (<select name="priority" value={editData.priority} onChange={handleEditChange} className="bg-slate-700 p-1 rounded"><option value="3">Tinggi</option><option value="2">Sedang</option><option value="1">Rendah</option></select>) : (<span>{ {1:'Rendah', 2:'Sedang', 3:'Tinggi'}[task.priority] }</span> )}</span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <h3 className="font-bold mb-2 text-slate-300">Deskripsi</h3>
                    {isEditing ? (<textarea name="description" value={editData.description} onChange={handleEditChange} className="w-full bg-slate-700 p-2 rounded mb-4" rows="5"></textarea>) : (<p className="text-slate-300 mb-6 whitespace-pre-wrap">{task.description || "Tidak ada deskripsi."}</p>)}
                    
                    <h3 className="font-bold mb-4 text-slate-300">Lampiran</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {attachments.map(att => (
                            <div key={att.id} className="relative group">
                                <a href={att.file_path} target="_blank" rel="noopener noreferrer" className="block w-full h-24 bg-slate-700 rounded-lg overflow-hidden">
                                    <img src={att.file_path} alt={att.file_name} className="w-full h-full object-cover" />
                                </a>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1">
                                    <p className="text-white text-xs truncate">{att.file_name}</p>
                                </div>
                                {(user.id === att.user_id) && (<button onClick={() => handleDeleteAttachment(att)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>)}
                            </div>
                        ))}
                        <label className="w-full h-24 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 transition-colors">
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? (<p className="text-sm text-slate-400">Uploading...</p>) : (
                                <>
                                    <span className="text-3xl text-slate-500">+</span>
                                    <p className="text-sm text-slate-500">Tambah File</p>
                                </>
                            )}
                        </label>
                    </div>

                    <h3 className="font-bold mb-4 text-slate-300">Diskusi</h3>
                    <div className="space-y-4 mb-4">
                        {loadingData ? <p>Memuat data...</p> : comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-800 flex-shrink-0 flex items-center justify-center font-bold text-cyan-300">{comment.users?.username?.substring(0, 2).toUpperCase()}</div>
                                <div className='bg-slate-700 p-3 rounded-lg rounded-tl-none w-full'>
                                    <p className="font-bold text-sm text-white">{comment.users?.username || 'User'} <span className="text-xs text-slate-500 font-normal ml-2">{new Date(comment.created_at).toLocaleString('id-ID')}</span></p>
                                    <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                         { !loadingData && comments.length === 0 && <p className="text-slate-500 text-sm">Belum ada diskusi.</p> }
                    </div>
                </div>

                <div className="flex-shrink-0 pt-4 border-t border-slate-700">
                     <form onSubmit={handleAddComment} className="flex gap-4 mb-4">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Tulis komentar..." className="flex-grow bg-slate-700 p-2 rounded border border-slate-600 focus:outline-none focus:border-cyan-500" />
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded font-semibold">Kirim</button>
                    </form>
                    <div className="flex justify-between items-center">
                         {isEditing ? (<div><button onClick={handleSave} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-2 font-semibold">Simpan Perubahan</button><button onClick={() => setIsEditing(false)} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded">Batal</button></div>) : ( isTeamOwner && task.status !== 'Selesai' && (<button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold">Edit Task</button>))}
                        {isTeamOwner && (<button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold">Hapus Task</button>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;