// frontend/src/components/CreateTaskModal.jsx

import { useState } from 'react';

const CreateTaskModal = ({ isOpen, onClose, onSubmit, userTeam }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(2); // Default prioritas 'Sedang'

    if (!isOpen) return null;

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
            team: userTeam // Tim diambil dari data user yang login
        });
        // Reset form
        setTitle('');
        setDescription('');
        setPriority(2);
    };

    return (
        // Overlay
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            {/* Modal Content */}
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Buat Kebutuhan Baru</h2>
                <form onSubmit={handleSubmit}>
                    {/* Judul */}
                    <div className="mb-4">
                        <label className="block mb-2">Kebutuhan / Judul Task</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500"
                            placeholder="Contoh: Benerin API Login"
                        />
                    </div>
                    {/* Deskripsi */}
                    <div className="mb-4">
                        <label className="block mb-2">Contoh Hasil yang Diharapkan (Deskripsi)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500"
                            rows="4"
                            placeholder="Contoh: Ketika hit API /login dengan data benar, harusnya dapat token."
                        ></textarea>
                    </div>
                    {/* Prioritas */}
                    <div className="mb-6">
                        <label className="block mb-2">Tingkat Prioritas</label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-cyan-500"
                        >
                            <option value="3">Tinggi</option>
                            <option value="2">Sedang</option>
                            <option value="1">Rendah</option>
                        </select>
                    </div>
                    {/* Buttons */}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded">Batal</button>
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 font-bold px-4 py-2 rounded">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;