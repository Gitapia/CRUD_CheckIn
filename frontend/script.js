let currentCheckoutId = null;
const API_BASE_URL = 'http://localhost:3000/api'; // Cambia esto si tu servidor está en otro puerto

// Navegación entre tabs - VERSIÓN CORREGIDA
function openTab(tabName, event = null) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    
    // Solo si event existe (cuando se llama desde un click)
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        // Si no hay event, activar el botón correspondiente manualmente
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tabName.toLowerCase()) || 
                btn.getAttribute('onclick')?.includes(tabName)) {
                btn.classList.add('active');
            }
        });
    }
    
    // Cargar datos específicos del tab
    if(tabName === 'huespedes') loadHuespedes();
    if(tabName === 'registros') loadRegistrosActivos();
    if(tabName === 'historial') loadHistorial();
}


// Formulario de Check-In - CORREGIDO
document.getElementById('checkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const huespedData = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        documento_identidad: document.getElementById('documento').value,
        fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
        nacionalidad: document.getElementById('nacionalidad').value
    };
    
    const registroData = {
        numero_habitacion: document.getElementById('numero_habitacion').value,
        tipo_habitacion: document.getElementById('tipo_habitacion').value,
        fecha_checkin: new Date().toISOString().slice(0, 19).replace('T', ' '),
        observaciones: document.getElementById('observaciones').value
    };
    
    try {
        console.log('📝 Creando huésped...', huespedData);
        
        // Primero crear el huésped
        const huespedResponse = await fetch(`${API_BASE_URL}/huespedes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(huespedData)
        });
        
        if (!huespedResponse.ok) {
            const errorData = await huespedResponse.json();
            throw new Error(errorData.error || 'Error creando huésped');
        }
        
        const huespedResult = await huespedResponse.json();
        console.log('✅ Huésped creado:', huespedResult);
        
        // Luego crear el registro con el ID del huésped
        registroData.huesped_id = huespedResult.id;
        console.log('📝 Creando registro...', registroData);
        
        const registroResponse = await fetch(`${API_BASE_URL}/registros`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(registroData)
        });
        
        if (!registroResponse.ok) {
            const errorData = await registroResponse.json();
            throw new Error(errorData.error || 'Error creando registro');
        }
        
        const registroResult = await registroResponse.json();
        console.log('✅ Registro creado:', registroResult);
        
        alert('✅ Check-In realizado exitosamente!');
        document.getElementById('checkinForm').reset();
        openTab('registros');
        
    } catch (error) {
        console.error('❌ Error en check-in:', error);
        alert(`❌ Error al realizar el check-in: ${error.message}`);
    }
});

// Cargar huéspedes - CORREGIDO
async function loadHuespedes() {
    try {
        console.log('📋 Cargando huéspedes...');
        const response = await fetch(`${API_BASE_URL}/huespedes`);
        
        if (!response.ok) {
            throw new Error('Error cargando huéspedes');
        }
        
        const huespedes = await response.json();
        console.log('✅ Huéspedes cargados:', huespedes);
        
        const tbody = document.getElementById('huespedesBody');
        tbody.innerHTML = '';
        
        huespedes.forEach(huesped => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${huesped.nombre}</td>
                <td>${huesped.email}</td>
                <td>${huesped.telefono || '-'}</td>
                <td>${huesped.documento_identidad}</td>
                <td>${huesped.nacionalidad || '-'}</td>
                <td>
                    <button class="btn-danger" onclick="deleteHuesped(${huesped.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('❌ Error cargando huéspedes:', error);
        alert('Error cargando la lista de huéspedes');
    }
}

// Cargar registros activos - CORREGIDO
async function loadRegistrosActivos() {
    try {
        console.log('📋 Cargando registros activos...');
        const response = await fetch(`${API_BASE_URL}/registros/activos`);
        
        if (!response.ok) {
            throw new Error('Error cargando registros activos');
        }
        
        const registros = await response.json();
        console.log('✅ Registros activos cargados:', registros);
        
        const tbody = document.getElementById('registrosBody');
        tbody.innerHTML = '';
        
        registros.forEach(registro => {
            const checkinDate = new Date(registro.fecha_checkin);
            const dias = Math.floor((new Date() - checkinDate) / (1000 * 60 * 60 * 24));
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${registro.nombre}</td>
                <td>${registro.numero_habitacion}</td>
                <td>${registro.tipo_habitacion}</td>
                <td>${formatDate(registro.fecha_checkin)}</td>
                <td>${dias} días</td>
                <td>
                    <button class="btn-primary" onclick="openCheckoutModal(${registro.id})">Check-Out</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('❌ Error cargando registros activos:', error);
        alert('Error cargando registros activos');
    }
}

// Cargar historial - CORREGIDO
async function loadHistorial() {
    try {
        console.log('📋 Cargando historial...');
        const response = await fetch(`${API_BASE_URL}/registros/historial`);
        
        if (!response.ok) {
            throw new Error('Error cargando historial');
        }
        
        const registros = await response.json();
        console.log('✅ Historial cargado:', registros);
        
        const tbody = document.getElementById('historialBody');
        tbody.innerHTML = '';
        
        registros.forEach(registro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${registro.nombre}</td>
                <td>${registro.numero_habitacion}</td>
                <td>${formatDate(registro.fecha_checkin)}</td>
                <td>${formatDate(registro.fecha_checkout)}</td>
                <td>$${registro.total_pagado || '0.00'}</td>
                <td><span class="estado-finalizado">Finalizado</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        alert('Error cargando historial');
    }
}

// Eliminar huésped - CORREGIDO
async function deleteHuesped(id) {
    if(confirm('¿Está seguro de que desea eliminar este huésped?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/huespedes/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error eliminando huésped');
            }
            
            await response.json();
            loadHuespedes();
            alert('✅ Huésped eliminado exitosamente');
        } catch (error) {
            console.error('❌ Error eliminando huésped:', error);
            alert(`❌ Error al eliminar huésped: ${error.message}`);
        }
    }
}

// Check-out - CORREGIDO
async function realizarCheckout(registroId, totalPago) {
    try {
        const response = await fetch(`${API_BASE_URL}/registros/${registroId}/checkout`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ total_pagado: totalPago })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error realizando check-out');
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Error en check-out:', error);
        throw error;
    }
}

// Modal de Check-Out
function openCheckoutModal(registroId) {
    currentCheckoutId = registroId;
    document.getElementById('checkoutModal').style.display = 'block';
}

// Cerrar modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('checkoutModal').style.display = 'none';
});

// Formulario de Check-Out - CORREGIDO
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const totalPago = document.getElementById('totalPago').value;
    
    try {
        await realizarCheckout(currentCheckoutId, totalPago);
        
        document.getElementById('checkoutModal').style.display = 'none';
        document.getElementById('checkoutForm').reset();
        alert('✅ Check-Out realizado exitosamente!');
        loadRegistrosActivos();
        loadHistorial();
    } catch (error) {
        alert(`❌ Error al realizar el check-out: ${error.message}`);
    }
});

// Utilidades
function formatDate(dateString) {
    if(!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Cerrar modal al hacer click fuera
window.addEventListener('click', (e) => {
    const modal = document.getElementById('checkoutModal');
    if(e.target === modal) {
        modal.style.display = 'none';
    }
});

// Función para probar la conexión con el API
async function testAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        console.log('✅ Test API exitoso:', data);
        return true;
    } catch (error) {
        console.error('❌ Test API falló:', error);
        return false;
    }
}

// Cargar datos iniciales y probar conexión
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 Inicializando aplicación...');
    
    // Probar conexión con el API
    const apiConnected = await testAPI();
    if (!apiConnected) {
        alert('⚠️ No se puede conectar con el servidor. Verifica que el servidor esté corriendo.');
    }
    
    loadRegistrosActivos();
});