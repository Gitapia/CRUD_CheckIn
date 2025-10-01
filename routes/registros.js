const express = require('express');
const router = express.Router();
const registrosController = require('../controllers/registrosController');

// GET /api/registros - Obtener todos los registros
router.get('/', registrosController.getAllRegistros);

// GET /api/registros/activos - Obtener registros activos
router.get('/activos', registrosController.getRegistrosActivos);

// GET /api/registros/historial - Obtener historial
router.get('/historial', registrosController.getHistorial);

// POST /api/registros - Crear nuevo registro (check-in)
router.post('/', registrosController.createRegistro);

// PUT /api/registros/:id/checkout - Realizar check-out
router.put('/:id/checkout', registrosController.checkout);

// PUT /api/registros/:id - Actualizar registro
router.put('/:id', registrosController.updateRegistro);

module.exports = router;