const express = require('express');
const path = require('path');
const { pool, testConnection } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Ruta de prueba para verificar que el API funciona
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Obtener todos los huéspedes - CON MYSQL
app.get('/api/huespedes', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM huespedes ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo huéspedes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nuevo huésped - CON MYSQL
app.post('/api/huespedes', async (req, res) => {
    try {
        const { nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad } = req.body;
        
        // Validaciones básicas
        if (!nombre || !email || !documento_identidad) {
            return res.status(400).json({ error: 'Nombre, email y documento son obligatorios' });
        }

        const [result] = await pool.execute(
            `INSERT INTO huespedes (nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad]
        );

        console.log('✅ Huésped creado en BD. ID:', result.insertId);
        res.status(201).json({ 
            id: result.insertId, 
            success: true,
            message: 'Huésped creado exitosamente'
        });
    } catch (error) {
        console.error('Error creando huésped:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El documento de identidad ya existe' });
        }
        
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener registros activos - CON MYSQL
app.get('/api/registros/activos', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*, h.nombre, h.email, h.telefono, h.documento_identidad 
            FROM registros r 
            JOIN huespedes h ON r.huesped_id = h.id 
            WHERE r.estado = 'activo'
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo registros activos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener historial - CON MYSQL
app.get('/api/registros/historial', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*, h.nombre, h.email, h.telefono, h.documento_identidad 
            FROM registros r 
            JOIN huespedes h ON r.huesped_id = h.id 
            WHERE r.estado = 'finalizado'
            ORDER BY r.fecha_checkout DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nuevo registro (check-in) - CON MYSQL
app.post('/api/registros', async (req, res) => {
    try {
        const { huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones } = req.body;
        
        // Validaciones
        if (!huesped_id || !numero_habitacion || !tipo_habitacion) {
            return res.status(400).json({ 
                error: 'Huésped, número de habitación y tipo son obligatorios' 
            });
        }

        // Verificar que la habitación no esté ocupada
        const [habitacionOcupada] = await pool.execute(
            'SELECT id FROM registros WHERE numero_habitacion = ? AND estado = "activo"',
            [numero_habitacion]
        );

        if (habitacionOcupada.length > 0) {
            return res.status(400).json({ 
                error: 'La habitación ya está ocupada' 
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO registros (huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones) 
             VALUES (?, ?, ?, ?, ?)`,
            [huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones]
        );

        console.log('✅ Registro creado en BD. ID:', result.insertId);
        res.status(201).json({ 
            id: result.insertId, 
            success: true,
            message: 'Check-in realizado exitosamente'
        });
    } catch (error) {
        console.error('Error creando registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Check-out - CON MYSQL
app.put('/api/registros/:id/checkout', async (req, res) => {
    try {
        const { id } = req.params;
        const { total_pagado } = req.body;

        const [result] = await pool.execute(
            `UPDATE registros SET 
                fecha_checkout = NOW(), 
                estado = 'finalizado',
                total_pagado = ?
             WHERE id = ? AND estado = 'activo'`,
            [total_pagado || 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: 'Registro no encontrado o ya finalizado' 
            });
        }

        console.log(`✅ Check-out realizado para registro ${id}`);
        res.json({ 
            success: true, 
            message: 'Check-out realizado exitosamente',
            fecha_checkout: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error realizando check-out:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar huésped - CON MYSQL
app.delete('/api/huespedes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el huésped tiene registros activos
        const [activeRegistros] = await pool.execute(
            'SELECT COUNT(*) as count FROM registros WHERE huesped_id = ? AND estado = "activo"',
            [id]
        );

        if (activeRegistros[0].count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el huésped porque tiene registros activos' 
            });
        }

        const [result] = await pool.execute('DELETE FROM huespedes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Huésped no encontrado' });
        }

        console.log(`✅ Huésped ${id} eliminado de la BD`);
        res.json({ success: true, message: 'Huésped eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando huésped:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas para el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/checkin', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/huespedes', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/registros', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/historial', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar servidor
async function startServer() {
    try {
        // Probar conexión a la base de datos
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.log('⚠️  Usando datos de prueba (sin base de datos)');
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📊 API disponible en http://localhost:${PORT}/api`);
            console.log(`🏨 Frontend disponible en http://localhost:${PORT}`);
            console.log(`🧪 Ruta de prueba: http://localhost:${PORT}/api/test`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
    }
}

startServer();