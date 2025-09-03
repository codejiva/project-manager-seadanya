const PriorityBadge = ({ priority }) => {
    const styles = {
        1: 'bg-green-500/20 text-green-400', // Rendah
        2: 'bg-yellow-500/20 text-yellow-400', // Sedang
        3: 'bg-red-500/20 text-red-400', // Tinggi
    };
    const text = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[priority]}`}>{text[priority]}</span>;
};

const TaskCard = ({ task, user, onStatusChange }) => {
    const isDeveloper = user.role === 'DEVELOPER';

    return (
        <div className="bg-slate-700 p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg">{task.title}</h4>
                <PriorityBadge priority={task.priority} />
            </div>
            <p className="text-sm text-slate-400 mb-3">{task.description}</p>
            <div className="flex justify-between items-end text-xs text-slate-500 border-t border-slate-600 pt-2">
                <div>
                    <p>Tim: <span className="font-bold text-slate-300">{task.team}</span></p>
                    {/* Munculin username requester HANYA untuk developer */}
                    {isDeveloper && task.users && (
                        <p>Request oleh: <span className="font-bold text-slate-300">{task.users.username}</span></p>
                    )}
                </div>

                {/* Logic untuk tombol aksi */}
                <div>
                    {isDeveloper && task.status === 'Belum Dikerjakan' && (
                        <button onClick={() => onStatusChange(task.id, 'Lagi Dikerjakan')} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs">Kerjakan</button>
                    )}
                    {!isDeveloper && task.status === 'Lagi Dikerjakan' && (
                         <button onClick={() => onStatusChange(task.id, 'Selesai')} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">Selesaikan</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;