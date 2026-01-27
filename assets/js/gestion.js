let servicios = [];
let listaUsuarios = []; 

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosIniciales();
    cargarDatosMegafonia(); // Carga los textos actuales de las alertas al entrar
});

// ==========================================
// 1. CARGA DE DATOS INICIALES
// ==========================================

async function cargarDatosIniciales() {
    // A. Pedimos la lista de voluntarios para el buscador
    const { data: users, error } = await sb
        .from('perfiles')
        .select('nombre, rol')
        .order('nombre', { ascending: true });

    if (users) {
        listaUsuarios = users;
    }

    // B. Cargamos los servicios
    cargarServiciosDeNube();
}

// Carga el estado actual de los paneles de Megafonía y Alerta
async function cargarDatosMegafonia() {
    // 1. Megafonía Interna (Voluntarios)
    const { data: anuncio } = await sb.from('anuncios').select('*').eq('id', 1).single();
    if(anuncio) {
        document.getElementById('anuncio-mensaje').value = anuncio.mensaje;
        document.getElementById('anuncio-tipo').value = anuncio.tipo;
    }

    // 2. Alerta Pública (Población)
    const { data: alerta } = await sb.from('alerta_publica').select('*').eq('id', 1).single();
    if(alerta) {
        document.getElementById('publica-mensaje').value = alerta.mensaje;
        document.getElementById('publica-color').value = alerta.color;
        // Nota: Ya no cargamos 'activa' porque decidimos que siempre sea true
    }
}

// ==========================================
// 2. GESTIÓN DE SERVICIOS (Descarga y Orden)
// ==========================================

async function cargarServiciosDeNube() {
    const contenedor = document.getElementById('contenedor-servicios');
    contenedor.innerHTML = '<p class="text-center text-gray-400 mt-10">Conectando con base de datos...</p>';

    // Descargamos todo sin ordenar desde la BB.DD.
    const { data: datosSinOrden, error } = await sb
        .from('servicios')
        .select('*');

    if (error) {
        alert("Error de conexión al cargar servicios");
        return;
    }

    // ORDENACIÓN INTELIGENTE EN JS (Fecha + Hora)
    servicios = datosSinOrden.sort((a, b) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`);
        const tiempoB = new Date(`${b.fecha}T${b.hora}`);
        return tiempoA - tiempoB;
    });

    renderizarServicios();
}

function renderizarServicios() {
    const contenedorFuturo = document.getElementById('contenedor-servicios');
    const contenedorHistorial = document.getElementById('contenedor-historial');
    
    contenedorFuturo.innerHTML = ''; 
    contenedorHistorial.innerHTML = '';

    const hoy = new Date();
    hoy.setHours(0,0,0,0); // Ignoramos la hora actual para comparar solo fechas

    const eventosFuturos = [];
    const eventosPasados = [];

    // Separamos futuros y pasados
    servicios.forEach(evento => {
        const fechaEvento = new Date(evento.fecha);
        (fechaEvento >= hoy) ? eventosFuturos.push(evento) : eventosPasados.push(evento);
    });

    // Ordenamos el historial al revés (los más recientes arriba)
    eventosPasados.sort((a, b) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`);
        const tiempoB = new Date(`${b.fecha}T${b.hora}`);
        return tiempoB - tiempoA; 
    });

    // Pintamos las tarjetas
    eventosFuturos.forEach(ev => contenedorFuturo.innerHTML += crearTarjetaHTML(ev, false));
    eventosPasados.forEach(ev => contenedorHistorial.innerHTML += crearTarjetaHTML(ev, true));

    // Mensajes de vacío
    if(eventosFuturos.length === 0) contenedorFuturo.innerHTML = '<p class="text-gray-400 italic text-center">No hay servicios próximos.</p>';
    if(eventosPasados.length === 0) contenedorHistorial.innerHTML = '<p class="text-gray-400 italic text-center">No hay historial disponible.</p>';
}

// ==========================================
// 3. GENERADOR DE TARJETAS HTML (Visual)
// ==========================================

function crearTarjetaHTML(evento, esHistorial) {
    let htmlEquipo = '';
    const listaEquipo = evento.equipo || []; 
    const listaCandidatos = evento.candidatos || []; 

    // A. PINTAR EQUIPO CONFIRMADO
    listaEquipo.forEach((voluntario, iVol) => {
        htmlEquipo += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2 shadow-sm">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-blue-100 text-pc-blue flex items-center justify-center text-xs font-bold border border-blue-200">
                        ${voluntario.nombre.charAt(0)}
                    </span>
                    <div>
                        <p class="font-bold text-gray-700 text-sm">${voluntario.nombre}</p>
                        <p class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 inline-block mt-1">${voluntario.puesto}</p>
                    </div>
                </div>
                ${!esHistorial ? `<button onclick="borrarVoluntario(${evento.id}, ${iVol})" class="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition">🗑️</button>` : ''}
            </div>
        `;
    });

    // B. PINTAR SOLICITUDES PENDIENTES (Candidatos)
    let htmlCandidatos = '';
    if (!esHistorial && listaCandidatos.length > 0) {
        htmlCandidatos += `<div class="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <h4 class="text-xs font-bold text-yellow-700 uppercase mb-2 flex items-center gap-1">🔔 Solicitudes Pendientes (${listaCandidatos.length})</h4>`;
        
        listaCandidatos.forEach((candidato, iCand) => {
            htmlCandidatos += `
                <div class="flex justify-between items-center bg-white p-2 rounded border border-yellow-100 mb-1">
                    <span class="text-sm font-bold text-gray-700">${candidato.nombre}</span>
                    <div class="flex gap-1">
                        <button onclick="aceptarCandidato(${evento.id}, ${iCand})" class="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded shadow" title="Aceptar">✅</button>
                        <button onclick="rechazarCandidato(${evento.id}, ${iCand})" class="bg-red-400 hover:bg-red-500 text-white text-xs px-2 py-1 rounded shadow" title="Rechazar">❌</button>
                    </div>
                </div>
            `;
        });
        htmlCandidatos += `</div>`;
    }

    // C. FORMULARIO DE ASIGNACIÓN DIRECTA
    let opcionesHTML = '';
    listaUsuarios.forEach(usuario => { opcionesHTML += `<option value="${usuario.nombre}">${usuario.rol}</option>`; });
    const dataListID = `lista-voluntarios-${evento.id}`;

    const formularioHTML = !esHistorial ? `
        <form onsubmit="anadirVoluntario(event, ${evento.id})" class="mt-4 flex flex-col md:flex-row gap-3 border-t border-gray-100 pt-4">
            
            <div class="w-full md:w-1/2 relative">
                <input list="${dataListID}" name="nombre" class="w-full pl-3 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pc-orange" placeholder="Buscar voluntario..." required autocomplete="off">
                <datalist id="${dataListID}">${opcionesHTML}</datalist>
            </div>
            
            <div class="w-full md:w-1/3 relative">
                <input type="text" name="puesto" placeholder="Puesto (ej: Conductor)..." class="w-full pl-3 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pc-orange">
            </div>

            <button type="submit" class="w-full md:w-auto bg-blue-100 hover:bg-blue-200 text-pc-blue border border-blue-200 px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
                <span>➕</span> Añadir
            </button>
        </form>
    ` : '<div class="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 text-center border border-gray-200">🔒 Evento finalizado</div>';

    const bordeColor = esHistorial ? 'border-gray-300 bg-gray-50 opacity-90' : 'border-pc-blue bg-white';
    
    return `
        <div class="${bordeColor} rounded-xl shadow-md overflow-hidden border-l-8 transition hover:shadow-lg mb-6">
            <div class="p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-lg md:text-xl font-bold text-gray-800 leading-tight">${evento.titulo}</h2>
                        <div class="flex flex-wrap gap-3 mt-2 text-sm font-medium">
                            <span class="text-pc-orange flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">📅 ${new Date(evento.fecha).toLocaleDateString()}</span>
                            <span class="text-pc-blue flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">⏰ ${evento.hora}</span>
                        </div>
                    </div>
                    <button onclick="borrarEvento(${evento.id})" class="text-gray-300 hover:text-red-500 transition p-1" title="Borrar Evento">🗑️</button>
                </div>
                
                <p class="text-gray-600 text-sm mb-5 italic border-l-4 border-gray-200 pl-3">"${evento.descripcion}"</p>
                <hr class="border-gray-100 my-4">
                
                ${htmlCandidatos}

                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">👥 Equipo Confirmado</h3>
                    <div class="space-y-2">
                        ${htmlEquipo}
                        ${listaEquipo.length === 0 ? '<div class="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">Nadie confirmado aún</div>' : ''}
                    </div>
                    ${formularioHTML}
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 4. LÓGICA DE BASE DE DATOS (CRUD)
// ==========================================

// CREAR EVENTO
document.getElementById('form-servicio').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nuevoEvento = {
        titulo: document.getElementById('titulo-evento').value,
        fecha: document.getElementById('fecha-evento').value,
        hora: document.getElementById('hora-evento').value,
        descripcion: document.getElementById('desc-evento').value,
        equipo: []
    };
    const { error } = await sb.from('servicios').insert([nuevoEvento]);
    if (!error) { cerrarModal(); this.reset(); cargarServiciosDeNube(); }
});

// AÑADIR VOLUNTARIO (MANUAL)
async function anadirVoluntario(e, idEvento) {
    e.preventDefault();
    const inputNombre = e.target.nombre; 
    const inputPuesto = e.target.puesto;
    
    const eventoActual = servicios.find(s => s.id === idEvento);

    // Evitamos duplicados
    const yaExiste = eventoActual.equipo.some(v => v.nombre === inputNombre.value);
    if(yaExiste) {
        alert("¡Este voluntario ya está asignado a este servicio!");
        return;
    }

    const nuevoEquipo = [...eventoActual.equipo, { nombre: inputNombre.value, puesto: inputPuesto.value || "General" }];
    const { error } = await sb.from('servicios').update({ equipo: nuevoEquipo }).eq('id', idEvento);
    if (!error) { cargarServiciosDeNube(); }
}

// BORRAR VOLUNTARIO
async function borrarVoluntario(idEvento, indexVoluntario) {
    const eventoActual = servicios.find(s => s.id === idEvento);
    const nuevoEquipo = [...eventoActual.equipo];
    nuevoEquipo.splice(indexVoluntario, 1);
    const { error } = await sb.from('servicios').update({ equipo: nuevoEquipo }).eq('id', idEvento);
    if (!error) { cargarServiciosDeNube(); }
}

// BORRAR EVENTO COMPLETO
async function borrarEvento(id) {
    if(confirm("¿Borrar este servicio?")) {
        const { error } = await sb.from('servicios').delete().eq('id', id);
        if (!error) { cargarServiciosDeNube(); }
    }
}

// ==========================================
// 5. GESTIÓN DE CANDIDATOS (SOLICITUDES)
// ==========================================

async function aceptarCandidato(idEvento, indexCandidato) {
    const evento = servicios.find(s => s.id === idEvento);
    const candidato = evento.candidatos[indexCandidato];

    // 1. Lo añadimos al equipo oficial
    const nuevoEquipo = [...evento.equipo, { 
        nombre: candidato.nombre, 
        puesto: "General" 
    }];

    // 2. Lo borramos de la lista de candidatos
    const nuevosCandidatos = [...evento.candidatos];
    nuevosCandidatos.splice(indexCandidato, 1);

    // 3. Guardamos ambos cambios
    const { error } = await sb
        .from('servicios')
        .update({ 
            equipo: nuevoEquipo,
            candidatos: nuevosCandidatos
        })
        .eq('id', idEvento);

    if (!error) cargarServiciosDeNube();
}

async function rechazarCandidato(idEvento, indexCandidato) {
    if(!confirm("¿Rechazar solicitud?")) return;

    const evento = servicios.find(s => s.id === idEvento);
    const nuevosCandidatos = [...evento.candidatos];
    nuevosCandidatos.splice(indexCandidato, 1);

    const { error } = await sb
        .from('servicios')
        .update({ candidatos: nuevosCandidatos })
        .eq('id', idEvento);

    if (!error) cargarServiciosDeNube();
}

// ==========================================
// 6. ZONA DE ALERTAS (Megafonía y Pública)
// ==========================================

// A. PUBLICAR ANUNCIO INTERNO (VOLUNTARIOS)
async function publicarAnuncio(e) {
    e.preventDefault();
    const mensaje = document.getElementById('anuncio-mensaje').value;
    const tipo = document.getElementById('anuncio-tipo').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "Actualizando..."; btn.disabled = true;

    const { error } = await sb.from('anuncios').update({ 
        mensaje: mensaje, tipo: tipo, created_at: new Date() 
    }).eq('id', 1);

    if (!error) alert("📢 Tablón interno actualizado.");
    else alert("Error: " + error.message);

    btn.innerText = "Publicar"; btn.disabled = false;
}

// B. PUBLICAR ALERTA PÚBLICA (VECINOS)
async function publicarAlertaPublica(e) {
    e.preventDefault();
    
    const mensaje = document.getElementById('publica-mensaje').value;
    const color = document.getElementById('publica-color').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "Enviando..."; btn.disabled = true;

    const { error } = await sb.from('alerta_publica').update({ 
        mensaje: mensaje, 
        color: color, 
        activa: true, // SIEMPRE VISIBLE
        created_at: new Date() 
    }).eq('id', 1);

    if (!error) alert("🚨 Web pública actualizada correctamente.");
    else alert("Error: " + error.message);

    btn.innerText = "Actualizar Web"; btn.disabled = false;
}

// ==========================================
// 7. FUNCIONES AUXILIARES (MODAL)
// ==========================================
function abrirModalServicio() { document.getElementById('modal-servicio').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modal-servicio').classList.add('hidden'); }