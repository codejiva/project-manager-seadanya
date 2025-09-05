import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CreateTaskModal = ({ isOpen, onClose, onSubmit, userTeam, user }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(2);
    const [dueDate, setDueDate] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const uploadedFiles = [];

        for (const file of files) {
            const filePath = `${user.username}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
            if (uploadError) {
                console.error("Error uploading file:", uploadError);
                alert(`Gagal mengupload file: ${file.name}`);
                continue;
            }
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
            uploadedFiles.push({
                file_name: file.name,
                file_path: publicUrl,
                file_type: file.type,
                file_size: file.size,
            });
        }
        setAttachments(prev => [...prev, ...uploadedFiles]);
        setUploading(false);
    };
    
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority(2);
        setDueDate('');
        setAttachments([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title) return alert('Judul kebutuhan harus diisi!');
        
        onSubmit({
            title, description,
            priority: parseInt(priority, 10),
            team: userTeam,
            due_date: dueDate || null,
            attachments: attachments, // Kirim data attachments
        });
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Buat Kebutuhan Baru</h2>
                <form onSubmit={handleSubmit}>
                    {/* ... (Input Judul, Deskripsi, Deadline, Prioritas tidak berubah) ... */}
                    <div className="mb-4">
                        <label className="block mb-2 text-slate-300">Lampiran (Opsional)</label>
                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                            <input type="file" id="file-upload" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            <label htmlFor="file-upload" className="cursor-pointer text-cyan-400 hover:text-cyan-300">
                                {uploading ? 'Mengupload...' : 'Pilih file...'}
                            </label>
                            <div className="mt-2 text-xs text-slate-400 space-y-1">
                                {attachments.map((file, index) => (
                                    <p key={index}>✓ {file.file_name}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded">Batal</button>
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 font-bold px-4 py-2 rounded" disabled={uploading}>
                            {uploading ? 'Menunggu Upload...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;