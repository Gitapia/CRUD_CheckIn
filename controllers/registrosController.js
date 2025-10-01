const { pool } = require('../config/database');

const registrosController = {
    // Obtener todos los registros con información del huésped
    async getAllRegistros(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT r.*, h.nombre, h.email, h.telefono, h.documento_identidad 
                FROM registros r 
                JOIN huespedes h ON r.huesped_id = h.id 
                ORDER BY r.created_at DESC
            `);
            res.json(rows);
        } catch (error) {
            console.error('Error obteniendo registros:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener registros activos
    async getRegistrosActivos(req, res) {
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
    },

    // Obtener historial (registros finalizados)
    async getHistorial(req, res) {
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
    },

    // Crear un nuevo registro (check-in)
    async createRegistro(req, res) {
        try {
            const { huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones } = req.body;
            
            // Validaciones
            if (!huesped_id || !numero_habitacion || !tipo_habitacion) {
                return res.status(400).json({ 
                    error: 'Huésped, número de habitación y tipo son obligatorios' 
                });
            }

            // Verificar que el huésped existe
            const [huesped] = await pool.execute(
                'SELECT id FROM huespedes WHERE id = ?',
                [huesped_id]
            );

            if (huesped.length === 0) {
                return res.status(404).json({ error: 'Huésped no encontrado' });
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
                `INSERT INTO registros 
                (huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones) 
                VALUES (?, ?, ?, ?, ?)`,
                [huesped_id, numero_habitacion, tipo_habitacion, fecha_checkin, observaciones]
            );

            res.status(201).json({ 
                id: result.insertId, 
                success: true,
                message: 'Check-in realizado exitosamente'
            });
        } catch (error) {
            console.error('Error creando registro:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Realizar check-out
    async checkout(req, res) {
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

            res.json({ 
                success: true, 
                message: 'Check-out realizado exitosamente',
                fecha_checkout: new Date()
            });
        } catch (error) {
            console.error('Error realizando check-out:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Actualizar información del registro
    async updateRegistro(req, res) {
        try {
            const { id } = req.params;
            const { numero_habitacion, tipo_habitacion, observaciones } = req.body;

            const [result] = await pool.execute(
                `UPDATE registros SET 
                numero_habitacion = ?, tipo_habitacion = ?, observaciones = ?
                WHERE id = ? AND estado = 'activo'`,
                [numero_habitacion, tipo_habitacion, observaciones, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    error: 'Registro no encontrado o ya finalizado' 
                });
            }

            res.json({ success: true, message: 'Registro actualizado exitosamente' });
        } catch (error) {
            console.error('Error actualizando registro:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = registrosController;