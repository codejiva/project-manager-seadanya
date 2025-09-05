const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password harus diisi' });
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !user) return res.status(401).json({ error: 'Username tidak ditemukan' });
    if (password !== user.password) return res.status(401).json({ error: 'Password salah' });
    delete user.password;
    res.json({ message: 'Login berhasil', user });
});

// --- TASKS ---
app.get('/api/tasks', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const userTeam = req.headers['x-user-team'];

    let { data, error } = await supabase.rpc('get_tasks_with_comment_count');
    if (error) return res.status(500).json({ error: "Gagal mengambil data dari database: " + error.message });
    
    if (userRole === 'TEAM') {
        data = data.filter(task => task.team === userTeam);
    }
    
    const userIds = [...new Set(data.map(task => task.requester_id).filter(id => id != null))];
    if (userIds.length === 0) return res.json(data);

    const { data: users, error: userError } = await supabase.from('users').select('id, username').in('id', userIds);
    if (userError) return res.status(500).json({ error: "Gagal mengambil data user." });

    const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.username;
        return acc;
    }, {});

    const finalData = data.map(task => ({
        ...task,
        users: { username: userMap[task.requester_id] || 'N/A' }
    }));
    
    res.json(finalData);
});

app.post('/api/tasks', async (req, res) => {
    const { title, description, team, priority, requester_id, due_date } = req.body;
    if (!title || !team || !requester_id) return res.status(400).json({ error: "Judul, tim, dan ID requester harus diisi." });
    const { data, error } = await supabase.from('tasks').insert([{ title, description, team, priority, requester_id, due_date }]).select();
    if (error) return res.status(500).json({ error: "Gagal menyimpan task ke database." });
    res.status(201).json(data[0]);
});

app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, due_date } = req.body;
    const { data, error } = await supabase.from('tasks').update({ title, description, priority, due_date }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

app.put('/api/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, userRole } = req.body;
    if (userRole === 'DEVELOPER' && !['Belum Dikerjakan', 'Lagi Dikerjakan'].includes(status)) return res.status(403).json({ error: 'Developer hanya bisa mengubah status antara "Belum" dan "Lagi Dikerjakan".' });
    if (userRole === 'TEAM' && status !== 'Selesai') return res.status(403).json({ error: 'Tim hanya bisa mengubah status menjadi "Selesai".' });
    const { data, error } = await supabase.from('tasks').update({ status }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// --- COMMENTS ---
app.get('/api/tasks/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('comments').select(`*, users (username)`).eq('task_id', id).order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/tasks/:id/comments', async (req, res) => {
    const { id: task_id } = req.params;
    const { content, user_id } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ content, task_id, user_id }]).select(`*, users (username)`).single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// --- ATTACHMENTS ---
app.get('/api/tasks/:id/attachments', async (req, res) => {
    const { id: task_id } = req.params;
    const { data, error } = await supabase.from('attachments').select(`*, users (username)`).eq('task_id', task_id).order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/tasks/:id/attachments', async (req, res) => {
    const { id: task_id } = req.params;
    const { file_name, file_path, file_type, file_size, user_id } = req.body;
    const { data, error } = await supabase.from('attachments').insert([{ file_name, file_path, file_type, file_size, task_id, user_id }]).select(`*, users (username)`).single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.delete('/api/attachments/:id', async (req, res) => {
    const { id } = req.params;
    const { error: dbError } = await supabase.from('attachments').delete().eq('id', id);
    if (dbError) return res.status(500).json({ error: dbError.message });
    res.status(204).send();
});

app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));