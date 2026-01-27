// INICIALIZAR MAPA
const map = L.map('map').setView([38.500, -0.363], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let capaDibujo = L.layerGroup().addTo(map);
let modoActual = 'punto'; 
let puntosDibujados = []; 

const statusText = document.getElementById('status-coords');
const btnReset = document.getElementById('btn-reset');

document.addEventListener('DOMContentLoaded', () => {
    cargarListaElementos();
    // Activar modo por defecto
    setModo('punto');
});

// 1. DIBUJAR EN EL MAPA
map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (modoActual === 'punto') {
        capaDibujo.clearLayers();
        L.marker([lat, lng]).addTo(capaDibujo);
        
        document.getElementById('input-lat').value = lat;
        document.getElementById('input-lng').value = lng;
        
        statusText.innerText = "📍 Punto marcado correctamente";
        statusText.className = "text-green-600 font-bold truncate";
        
    } else {
        puntosDibujados.push([lat, lng]);
        
        // Redibujar todo lo que llevamos
        capaDibujo.clearLayers();
        
        // Puntos intermedios
        puntosDibujados.forEach(p => L.circleMarker(p, { radius: 4, color: 'red', fillColor: 'white', fillOpacity: 1 }).addTo(capaDibujo));

        if (modoActual === 'linea') {
            L.polyline(puntosDibujados, { color: 'blue', weight: 4, dashArray: '5, 10' }).addTo(capaDibujo);
            statusText.innerText = `➖ Dibujando línea (${puntosDibujados.length} puntos)`;
        } else if (modoActual === 'zona') {
            L.polygon(puntosDibujados, { color: 'orange' }).addTo(capaDibujo);
            statusText.innerText = `⬠ Dibujando zona (${puntosDibujados.length} vértices)`;
        }
        
        document.getElementById('input-coords').value = JSON.stringify(puntosDibujados);
        statusText.className = "text-blue-600 font-bold truncate";
        btnReset.classList.remove('hidden');
    }
});

// 2. CAMBIAR HERRAMIENTA (PUNTO / LÍNEA / ZONA)
function setModo(modo) {
    modoActual = modo;
    borrarDibujo();
    
    // Estilos botones
    document.querySelectorAll('.modo-btn').forEach(b => {
        b.classList.remove('bg-blue-100', 'text-blue-700', 'ring-2', 'ring-blue-500');
        b.classList.add('bg-gray-50', 'text-gray-600');
    });
    const btnActivo = document.getElementById('btn-' + modo);
    if(btnActivo) {
        btnActivo.classList.remove('bg-gray-50', 'text-gray-600');
        btnActivo.classList.add('bg-blue-100', 'text-blue-700', 'ring-2', 'ring-blue-500');
    }
    
    // Instrucciones flotantes
    const instrucciones = document.getElementById('instrucciones-mapa');
    const textoInst = document.getElementById('texto-instruccion');
    instrucciones.classList.remove('hidden');
    
    if(modo === 'punto') textoInst.innerText = "Toca un lugar para marcar";
    if(modo === 'linea') textoInst.innerText = "Toca varios puntos para trazar";
    if(modo === 'zona') textoInst.innerText = "Marca el perímetro de la zona";
}

function borrarDibujo() {
    capaDibujo.clearLayers();
    puntosDibujados = [];
    document.getElementById('input-lat').value = '';
    document.getElementById('input-lng').value = '';
    document.getElementById('input-coords').value = '';
    
    statusText.innerText = "Selecciona herramienta y dibuja 👆";
    statusText.className = "text-gray-500 italic truncate";
    btnReset.classList.add('hidden');
}

// 3. GUARDAR (CON SWEETALERT)
document.getElementById('form-mapa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = "⏳ Guardando...";

    const titulo = document.getElementById('titulo').value;
    const desc = document.getElementById('descripcion').value;
    const color = document.getElementById('color').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;

    let datosInsert = {
        titulo: titulo,
        descripcion: desc,
        tipo: modoActual,
        color: color,
        inicio: fechaInicio ? new Date(fechaInicio) : null,
        fin: fechaFin ? new Date(fechaFin) : null
    };

    // Validaciones visuales con SweetAlert
    if (modoActual === 'punto') {
        datosInsert.lat = document.getElementById('input-lat').value;
        datosInsert.lng = document.getElementById('input-lng').value;
        if(!datosInsert.lat) { 
            Swal.fire({ icon: 'warning', title: '¡Falta el punto!', text: 'Toca en el mapa donde quieras colocar el aviso.' });
            btn.disabled=false; btn.innerHTML=textoOriginal; return; 
        }
    } else {
        const rawCoords = document.getElementById('input-coords').value;
        if(!rawCoords) { 
            Swal.fire({ icon: 'warning', title: '¡Mapa vacío!', text: 'Dibuja la línea o zona en el mapa antes de guardar.' });
            btn.disabled=false; btn.innerHTML=textoOriginal; return; 
        }
        datosInsert.coordenadas = JSON.parse(rawCoords);
        if (modoActual === 'zona') datosInsert.relleno = 'yellow';
    }

    const { error } = await sb.from('mapa_elementos').insert([datosInsert]);

    if (error) { 
        Swal.fire('Error', error.message, 'error');
    } else { 
        // ÉXITO
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Elemento publicado en el mapa' });
        
        borrarDibujo(); 
        e.target.reset(); 
        // Restaurar modo por defecto para que no se quede loco
        setModo('punto');
        cargarListaElementos(); 
    }
    btn.disabled = false; btn.innerHTML = textoOriginal;
});

// 4. LISTAR ELEMENTOS
async function cargarListaElementos() {
    const divLista = document.getElementById('lista-elementos');
    const contador = document.getElementById('contador-elementos');
    
    // divLista.innerHTML = '<p class="text-center text-gray-400 py-4 animate-pulse">Cargando...</p>';
    
    const { data } = await sb.from('mapa_elementos').select('*').order('created_at', {ascending: false});
    
    if(data) {
        divLista.innerHTML = '';
        if(contador) contador.innerText = data.length;

        if(data.length === 0) {
            divLista.innerHTML = '<p class="text-center text-gray-400 py-4 italic">El mapa está limpio.</p>';
            return;
        }

        data.forEach(el => {
            const icono = el.tipo === 'punto' ? '📍' : (el.tipo === 'linea' ? '➖' : '⬠');
            
            // Lógica de estado (Activo / Programado / Caducado)
            let colorStatus = "bg-gray-100 text-gray-400 border-gray-200";
            let textoStatus = "Inactivo";
            
            if (!el.inicio && !el.fin) {
                // Siempre activo
                colorStatus = "bg-green-100 text-green-600 border-green-200";
                textoStatus = "Activo";
            } else if (el.inicio && el.fin) {
                const ahora = new Date();
                const ini = new Date(el.inicio);
                const fin = new Date(el.fin);

                if (ahora >= ini && ahora <= fin) {
                    colorStatus = "bg-green-100 text-green-600 border-green-200";
                    textoStatus = "En curso";
                } else if (ahora < ini) {
                    colorStatus = "bg-blue-100 text-blue-600 border-blue-200";
                    textoStatus = "Programado";
                } else {
                    colorStatus = "bg-red-50 text-red-400 border-red-100";
                    textoStatus = "Finalizado";
                }
            }

            divLista.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border hover:bg-white hover:shadow-sm transition mb-2 group">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-gray-700 truncate text-sm">${icono} ${el.titulo}</span>
                            <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${colorStatus}">${textoStatus}</span>
                        </div>
                        <p class="text-[10px] text-gray-500 truncate">${el.descripcion || 'Sin descripción'}</p>
                    </div>
                    <button onclick="eliminarElemento(${el.id})" class="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Eliminar del mapa">
                        🗑️
                    </button>
                </div>
            `;
        });
    }
}

// 5. BORRAR ELEMENTO
async function eliminarElemento(id) {
    const result = await Swal.fire({
        title: '¿Borrar del mapa?',
        text: "Desaparecerá de la web pública al instante.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if(result.isConfirmed) {
        await sb.from('mapa_elementos').delete().eq('id', id);
        
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Borrado' });
        
        cargarListaElementos();
    }
}