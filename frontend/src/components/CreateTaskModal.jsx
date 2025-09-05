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
        
        // --- PERBAIKAN: Bungkus semua proses di dalam try...catch...finally ---
        try {
            const uploadedFiles = [];
            for (const file of files) {
                const filePath = `${user.username}/${Date.now()}-${file.name}`;
                
                // Upload per file, jika satu gagal, yang lain tetap lanjut
                const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
                
                if (uploadError) {
                    console.error("Error uploading file:", uploadError);
                    alert(`Gagal mengupload file: ${file.name}`);
                    continue; // Lanjut ke file berikutnya jika ada
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
        } catch (error) {
            // Catch error yang lebih general jika ada
            console.error("Terjadi kesalahan tak terduga saat upload:", error);
            alert("Terjadi kesalahan tak terduga saat upload.");
        } finally {
            // Blok ini DIJAMIN akan selalu dijalankan
            setUploading(false);
        }
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
        if (!title) {
            alert('Judul kebutuhan harus diisi!');
            return;
        }
        
        onSubmit({
            title, 
            description,
            priority: parseInt(priority, 10),
            team: userTeam,
            due_date: dueDate || null,
            attachments: attachments,
        });
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Buat Kebutuhan Baru</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-slate-300">Kebutuhan / Judul Task</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500" placeholder="Contoh: Benerin API Login" />
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-slate-300">Contoh Hasil yang Diharapkan (Deskripsi)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500" rows="4" placeholder="Contoh: Ketika hit API /login, harusnya dapat token." />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block mb-2 text-slate-300">Tanggal Tenggat (Opsional)</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="block mb-2 text-slate-300">Tingkat Prioritas</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500">
                                <option value="3">Tinggi</option>
                                <option value="2">Sedang</option>
                                <option value="1">Rendah</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-slate-300">Lampiran (Opsional)</label>
                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                            <input type="file" id="file-upload" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            <label htmlFor="file-upload" className="cursor-pointer text-cyan-400 hover:text-cyan-300 font-semibold">
                                {uploading ? 'Mengupload...' : 'Pilih file untuk diupload'}
                            </label>
                            <div className="mt-2 text-xs text-slate-400 space-y-1">
                                {attachments.map((file, index) => (
                                    <div key={index} className="bg-slate-700 p-1 rounded text-left px-2">✓ {file.file_name}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded font-semibold">Batal</button>
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 font-bold px-4 py-2 rounded" disabled={uploading}>
                            {uploading ? 'Menunggu Upload...' : 'Simpan Tugas'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;