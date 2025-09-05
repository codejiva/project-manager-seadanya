const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// --- FITUR 3: Template Email Cantik ---
const createEmailTemplate = (title, body, buttonText, buttonLink) => {
    return `
    <!DOCTYPE html><html><head><style>body{font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #0f172a;}</style></head>
    <body style="background-color: #0f172a; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 8px; overflow: hidden; color: #cbd5e1;">
        <tr><td style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #334155;">
            <h1 style="margin: 0; font-size: 24px;">Web Manajemen Proyek</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
            <h2 style="color: #ffffff; margin-top: 0;">${title}</h2>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">${body}</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${buttonLink}" style="background-color: #0891b2; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">${buttonText}</a>
            </div>
        </td></tr>
        <tr><td style="background-color: #0f172a; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #334155;">
            <p style="margin: 0;">Notifikasi ini dikirim secara otomatis.</p>
        </td></tr>
    </table></td></tr></table></body></html>
    `;
};

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
    const { title, description, team, priority, requester_id, due_date, attachments } = req.body;
    if (!title || !team || !requester_id) return res.status(400).json({ error: "Judul, tim, dan ID requester harus diisi." });
    
    const { data: taskData, error: taskError } = await supabase.from('tasks').insert([{ title, description, team, priority, requester_id, due_date }]).select().single();
    if (taskError) return res.status(500).json({ error: "Gagal menyimpan task ke database." });

    if (attachments && attachments.length > 0) {
        const attachmentRecords = attachments.map(att => ({ ...att, task_id: taskData.id, user_id: requester_id }));
        const { error: attachmentError } = await supabase.from('attachments').insert(attachmentRecords);
        if (attachmentError) console.error("Gagal menyimpan record attachment:", attachmentError);
    }

    try {
        const { data: devUser } = await supabase.from('users').select('email').eq('role', 'DEVELOPER').single();
        const { data: requesterUser } = await supabase.from('users').select('username').eq('id', requester_id).single();
        if (devUser && devUser.email && requesterUser) {
            const emailBody = `Ada request tugas baru dari <strong>${requesterUser.username}</strong> (Tim ${team}).<br><br><strong>Judul:</strong> ${title}<br><strong>Deskripsi:</strong> ${description || 'Tidak ada'}`;
            const emailHtml = createEmailTemplate('Tugas Baru Dibuat', emailBody, 'Lihat Tugas', APP_URL);
            await resend.emails.send({ from: SENDER_EMAIL, to: devUser.email, subject: `[TUGAS BARU] ${title}`, html: emailHtml });
        }
    } catch (emailError) { console.error("Gagal kirim email notif task baru:", emailError); }

    res.status(201).json(taskData);
});

app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, due_date } = req.body;

    const { data: updatedTask, error } = await supabase.from('tasks').update({ title, description, priority, due_date }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    try {
        const { data: devUser } = await supabase.from('users').select('email').eq('role', 'DEVELOPER').single();
        const { data: taskOwner } = await supabase.from('users').select('username').eq('id', updatedTask.requester_id).single();

        if (devUser && devUser.email && taskOwner) {
            const emailBody = `Tugas yang direquest oleh <strong>${taskOwner.username}</strong> (Tim ${updatedTask.team}) telah diubah detailnya.`;
            const emailHtml = createEmailTemplate('Sebuah Tugas Telah Diupdate', emailBody, 'Lihat Perubahan', APP_URL);
            await resend.emails.send({ from: SENDER_EMAIL, to: devUser.email, subject: `[UPDATE] ${title}`, html: emailHtml });
        }
    } catch (emailError) { console.error("Gagal kirim email notif task update:", emailError); }
    
    res.json(updatedTask);
});

app.put('/api/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status: newStatus, userRole } = req.body;
    
    const { data: currentTask, error: findError } = await supabase.from('tasks').select('status, team, title').eq('id', id).single();
    if (findError || !currentTask) return res.status(404).json({ error: "Task tidak ditemukan." });

    if (userRole === 'DEVELOPER' && !['Belum Dikerjakan', 'Lagi Dikerjakan'].includes(newStatus)) return res.status(403).json({ error: 'Developer hanya bisa mengubah status antara "Belum" dan "Lagi Dikerjakan".' });
    if (userRole === 'TEAM' && newStatus !== 'Selesai') return res.status(403).json({ error: 'Tim hanya bisa mengubah status menjadi "Selesai".' });

    const { data, error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    
    try {
        if (newStatus === 'Lagi Dikerjakan' && currentTask.status === 'Belum Dikerjakan') {
            const { data: teamUsers } = await supabase.from('users').select('email').eq('team', currentTask.team);
            if (teamUsers && teamUsers.length > 0) {
                const recipientEmails = teamUsers.map(u => u.email).filter(Boolean);
                if (recipientEmails.length > 0) {
                    const emailBody = `Tugas dengan judul "<strong>${currentTask.title}</strong>" sudah mulai dikerjakan oleh developer.`;
                    const emailHtml = createEmailTemplate('Tugas Mulai Dikerjakan', emailBody, 'Lihat Progress', APP_URL);
                    await resend.emails.send({ from: SENDER_EMAIL, to: recipientEmails, subject: `[DIKERJAKAN] ${currentTask.title}`, html: emailHtml });
                }
            }
        }
        if (newStatus === 'Selesai' && currentTask.status === 'Lagi Dikerjakan') {
            const { data: devUser } = await supabase.from('users').select('email').eq('role', 'DEVELOPER').single();
            if (devUser && devUser.email) {
                const emailBody = `Tugas dengan judul "<strong>${currentTask.title}</strong>" telah disetujui dan diselesaikan oleh Tim ${currentTask.team}.`;
                const emailHtml = createEmailTemplate('Tugas Selesai', emailBody, 'Lihat Hasil', APP_URL);
                await resend.emails.send({ from: SENDER_EMAIL, to: devUser.email, subject: `[SELESAI] ${currentTask.title}`, html: emailHtml });
            }
        }
    } catch (emailError) { console.error("Gagal kirim email notif status:", emailError); }

    res.json(data[0]);
});

app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
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