// frontend/src/components/ConfirmationModal.jsx

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onCancel}>
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                <p className="text-lg mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onCancel}
                        className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-2 rounded"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6 py-2 rounded"
                    >
                        Yakin
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;