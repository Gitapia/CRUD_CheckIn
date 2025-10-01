const express = require('express');
const router = express.Router();
const huespedesController = require('../controllers/huespedesController');

// GET /api/huespedes - Obtener todos los huéspedes
router.get('/', huespedesController.getAllHuespedes);

// GET /api/huespedes/:id - Obtener un huésped por ID
router.get('/:id', huespedesController.getHuespedById);

// POST /api/huespedes - Crear un nuevo huésped
router.post('/', huespedesController.createHuesped);

// PUT /api/huespedes/:id - Actualizar un huésped
router.put('/:id', huespedesController.updateHuesped);

// DELETE /api/huespedes/:id - Eliminar un huésped
router.delete('/:id', huespedesController.deleteHuesped);

module.exports = router;