// backend/index.js

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Koneksi ke Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- API ENDPOINTS ---

// 1. Endpoint untuk Login
app.post('/api/login', async (req, res) => {
    console.log("--- Menerima request login ---");
    const { username, password } = req.body;

    console.log("Data diterima dari frontend:", { username, password });

    if (!username || !password) {
        console.log("Error: Username atau password kosong.");
        return res.status(400).json({ error: 'Username dan password harus diisi' });
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error) {
        console.error("Error dari Supabase saat mencari user:", error.message);
        return res.status(500).json({ error: "Terjadi kesalahan pada server saat mencari user." });
    }

    if (!user) {
        console.log("Hasil: Username tidak ditemukan di database.");
        return res.status(401).json({ error: 'Username tidak ditemukan' });
    }

    console.log("User ditemukan di DB:", user);

    if (password !== user.password) {
        console.log("Hasil: Password salah.");
        return res.status(401).json({ error: 'Password salah' });
    }

    console.log("Hasil: Login berhasil!");
    delete user.password;
    res.json({ message: 'Login berhasil', user });
});


// 2. Endpoint untuk mengambil semua Task (dengan logika role)
app.get('/api/tasks', async (req, res) => {
    // Ambil info user dari header (ini cara simpel, nanti frontend yang kirim)
    const userRole = req.headers['x-user-role'];
    const userTeam = req.headers['x-user-team'];

    let query = supabase
        .from('tasks')
        .select(`
            *,
            users ( username )
        `) // Ambil username dari tabel users
        .order('created_at', { ascending: false });

    // Kalau bukan developer, filter berdasarkan timnya
    if (userRole === 'TEAM') {
        query = query.eq('team', userTeam);
    }

    const { data, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// 3. Endpoint untuk membuat Task baru
app.post('/api/tasks', async (req, res) => {
    console.log("--- Menerima request task baru ---");
    const { title, description, team, priority, requester_id } = req.body;
    console.log("Data diterima:", req.body);

    if (!title || !team || !requester_id) {
        return res.status(400).json({ error: "Judul, tim, dan ID requester harus diisi." });
    }

    const { data, error } = await supabase
        .from('tasks')
        .insert([{ title, description, team, priority, requester_id }])
        .select();

    if (error) {
        console.error("Error dari Supabase saat membuat task:", error.message);
        return res.status(500).json({ error: "Gagal menyimpan task ke database." });
    }

    console.log("Task berhasil dibuat:", data[0]);
    res.status(201).json(data[0]);
});

// 4. Endpoint untuk update status Task
app.put('/api/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, userRole } = req.body;

    // Logika perizinan sesuai permintaan lo
    if (userRole === 'DEVELOPER' && !['Lagi Dikerjain', 'Belum Dikerjain'].includes(status)) {
        return res.status(403).json({ error: 'Developer hanya bisa mengubah status menjadi "Lagi Dikerjakan"' });
    }
    if (userRole === 'TEAM' && status !== 'Selesai') {
        return res.status(403).json({ error: 'Tim hanya bisa mengubah status menjadi "Selesai"' });
    }

    const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data[0]);
});


app.listen(PORT, () => {
    console.log(`Server backend jalan di http://localhost:${PORT}`);
});