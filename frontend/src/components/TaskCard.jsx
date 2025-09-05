import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PriorityBadge = ({ priority }) => {
    const styles = { 1: 'bg-green-500/20 text-green-400', 2: 'bg-yellow-500/20 text-yellow-400', 3: 'bg-red-500/20 text-red-400' };
    const text = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' };
    return <span className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${styles[priority]}`}>{text[priority]}</span>;
};

const TaskCard = ({ task, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 0 };
    const priorityBorderStyle = { 1: 'border-l-4 border-green-500', 2: 'border-l-4 border-yellow-500', 3: 'border-l-4 border-red-500' };
    
    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick} className={`bg-slate-700 p-4 rounded-lg shadow-lg cursor-pointer active:cursor-grabbing ${priorityBorderStyle[task.priority]}`}>
            <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="font-bold text-lg pr-2">{task.title}</h4>
                <PriorityBadge priority={task.priority} />
            </div>
            <p className="text-sm text-slate-400 mb-4 break-words line-clamp-2">{task.description}</p>
            <div className="flex justify-between items-end text-xs text-slate-400">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Jumlah Komentar">💬 {task.comment_count || 0}</span>
                    {task.due_date && (
                        <span title={`Deadline: ${new Date(task.due_date).toLocaleDateString('id-ID')}`} className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'Selesai' ? 'text-red-400 font-bold' : ''}`}>
                            📅 {formatDate(task.due_date)}
                        </span>
                    )}
                </div>
                <div>
                     <p className="text-right">Oleh: <span className="font-bold text-slate-300">{task.users?.username || 'N/A'}</span></p>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;