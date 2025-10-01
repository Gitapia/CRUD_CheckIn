const { pool } = require('../config/database');

const huespedesController = {
    // Obtener todos los huéspedes
    async getAllHuespedes(req, res) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM huespedes ORDER BY created_at DESC'
            );
            res.json(rows);
        } catch (error) {
            console.error('Error obteniendo huéspedes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener un huésped por ID
    async getHuespedById(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.execute(
                'SELECT * FROM huespedes WHERE id = ?',
                [id]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Huésped no encontrado' });
            }
            
            res.json(rows[0]);
        } catch (error) {
            console.error('Error obteniendo huésped:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Crear un nuevo huésped
    async createHuesped(req, res) {
        try {
            const { nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad } = req.body;
            
            // Validaciones básicas
            if (!nombre || !email || !documento_identidad) {
                return res.status(400).json({ error: 'Nombre, email y documento son obligatorios' });
            }

            const [result] = await pool.execute(
                `INSERT INTO huespedes 
                (nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad]
            );

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
    },

    // Actualizar un huésped
    async updateHuesped(req, res) {
        try {
            const { id } = req.params;
            const { nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad } = req.body;

            const [result] = await pool.execute(
                `UPDATE huespedes SET 
                nombre = ?, email = ?, telefono = ?, documento_identidad = ?, 
                fecha_nacimiento = ?, nacionalidad = ? 
                WHERE id = ?`,
                [nombre, email, telefono, documento_identidad, fecha_nacimiento, nacionalidad, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Huésped no encontrado' });
            }

            res.json({ success: true, message: 'Huésped actualizado exitosamente' });
        } catch (error) {
            console.error('Error actualizando huésped:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Eliminar un huésped
    async deleteHuesped(req, res) {
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

            const [result] = await pool.execute(
                'DELETE FROM huespedes WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Huésped no encontrado' });
            }

            res.json({ success: true, message: 'Huésped eliminado exitosamente' });
        } catch (error) {
            console.error('Error eliminando huésped:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = huespedesController;