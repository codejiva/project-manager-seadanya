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

// --- Template Email dengan Tema Poster ---
const createEmailTemplate = ({ greeting, introText, details, outroText, buttonText, buttonLink, signature, signatureSender }) => {
    let detailsHtml = '';
    if (details) {
        detailsHtml = `
        <div style="background-color: #2a4a43; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #e0e0d1; font-size: 16px; line-height: 1.5;">
                <strong>Judul:</strong> ${details.title}<br>
                <strong>Deskripsi:</strong> ${details.description}
            </p>
        </div>
        `;
    }

    return `
    <!DOCTYPE html><html><head><style>body{font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #0c1a17;}</style></head>
    <body style="background-color: #0c1a17; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a2e2a; border: 1px solid #2a4a43; border-radius: 8px; overflow: hidden; color: #e0e0d1;">
        <tr><td style="padding: 30px;">
            <p style="font-size: 20px; margin-top: 0;">${greeting}</p>
            <p style="font-size: 16px; line-height: 1.5;">${introText}</p>
            ${detailsHtml}
            <p style="font-size: 16px; line-height: 1.5;">${outroText}</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${buttonLink}" style="background-color: #9dff00; color: #1a2e2a; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">${buttonText}</a>
            </div>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 5px;">${signature}</p>
            <p style="font-size: 16px; line-height: 1.5; font-weight: bold; margin: 0;">${signatureSender}</p>
        </td></tr>
        <tr><td style="background-color: #0c1a17; color: #6b7f7c; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #2a4a43;">
            <p style="margin: 0;">Notifikasi dari "Web Manajemen Proyek Biar Bung Nggak Tinggal Meninggal"</p>
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
            const emailHtml = createEmailTemplate({
                greeting: 'Halo, Bung!',
                introText: 'Ada request baru nih!',
                details: { title, description: description || 'Tidak ada' },
                outroText: 'Selengkapnya bisa dicek di web ya.',
                buttonText: 'Lihat Tugas',
                buttonLink: APP_URL,
                signature: 'Terima kasih,',
                signatureSender: `${requesterUser.username} - Tim ${team}`
            });
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
            const emailHtml = createEmailTemplate({
                greeting: `Hai, Bung!`,
                introText: `Ada update baru nih buat request-nya <strong>${taskOwner.username}</strong> dari tim <strong>${updatedTask.team}</strong>!`,
                outroText: 'Jangan lupa cek ya!',
                buttonText: 'Lihat Tugas',
                buttonLink: APP_URL,
                signature: 'Semangat,',
                signatureSender: 'Web Manajemen Proyek Tinggal Meninggal'
            });
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
                    const emailHtml = createEmailTemplate({
                        greeting: `Halo, Tim ${currentTask.team}!`,
                        introText: `Tugas dengan judul "<strong>${currentTask.title}</strong>" sudah mulai dikerjakan oleh developer.`,
                        outroText: 'Kamu akan diberi tahu lagi jika sudah selesai.',
                        buttonText: 'Lihat Progress',
                        buttonLink: APP_URL,
                        signature: 'Info dari,',
                        signatureSender: 'Web Manajemen Proyek Tinggal Meninggal'
                    });
                    await resend.emails.send({ from: SENDER_EMAIL, to: recipientEmails, subject: `[DIKERJAKAN] ${currentTask.title}`, html: emailHtml });
                }
            }
        }
        if (newStatus === 'Selesai' && currentTask.status === 'Lagi Dikerjakan') {
            const { data: devUser } = await supabase.from('users').select('email').eq('role', 'DEVELOPER').single();
            if (devUser && devUser.email) {
                const emailHtml = createEmailTemplate({
                    greeting: 'Mantap, Bung!',
                    introText: `Tugas dengan judul "<strong>${currentTask.title}</strong>" telah disetujui dan diselesaikan oleh Tim ${currentTask.team}.`,
                    outroText: 'Satu kerjaan lagi beres!',
                    buttonText: 'Lihat Hasil',
                    buttonLink: APP_URL,
                    signature: 'Kerja bagus,',
                    signatureSender: 'Web Manajemen Proyek Tinggal Meninggal'
                });
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