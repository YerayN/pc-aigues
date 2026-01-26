let servicios = [];
let listaUsuarios = []; // AQUÍ GUARDAREMOS LA LISTA DE COMPAÑEROS

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosIniciales();
});

// 1. CARGAMOS USUARIOS Y LUEGO SERVICIOS
async function cargarDatosIniciales() {
    // Pedimos la lista de voluntarios a la tabla 'perfiles'
    const { data: users, error } = await sb
        .from('perfiles')
        .select('nombre, rol')
        .order('nombre', { ascending: true }); // Ordenados alfabéticamente

    if (users) {
        listaUsuarios = users;
    }

    // Una vez tenemos los usuarios, cargamos los servicios
    cargarServiciosDeNube();
}

async function cargarServiciosDeNube() {
    const contenedor = document.getElementById('contenedor-servicios');
    contenedor.innerHTML = '<p class="text-center text-gray-400 mt-10">Conectando con base de datos...</p>';

    const { data, error } = await sb
        .from('servicios')
        .select('*')
        .order('fecha', { ascending: true });

    if (error) {
        alert("Error de conexión");
        return;
    }

    servicios = data;
    renderizarServicios();
}

function renderizarServicios() {
    const contenedorFuturo = document.getElementById('contenedor-servicios');
    const contenedorHistorial = document.getElementById('contenedor-historial');
    
    contenedorFuturo.innerHTML = ''; 
    contenedorHistorial.innerHTML = '';

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const eventosFuturos = [];
    const eventosPasados = [];

    servicios.forEach(evento => {
        const fechaEvento = new Date(evento.fecha);
        (fechaEvento >= hoy) ? eventosFuturos.push(evento) : eventosPasados.push(evento);
    });

    // Ordenamos: Futuros (cercanos primero), Pasados (recientes primero)
    eventosPasados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    eventosFuturos.forEach(ev => contenedorFuturo.innerHTML += crearTarjetaHTML(ev, false));
    eventosPasados.forEach(ev => contenedorHistorial.innerHTML += crearTarjetaHTML(ev, true));

    if(eventosFuturos.length === 0) contenedorFuturo.innerHTML = '<p class="text-gray-400 italic text-center">No hay servicios próximos.</p>';
    if(eventosPasados.length === 0) contenedorHistorial.innerHTML = '<p class="text-gray-400 italic text-center">No hay historial disponible.</p>';
}

function crearTarjetaHTML(evento, esHistorial) {
    let htmlEquipo = '';
    const listaEquipo = evento.equipo || []; 

    // Pintamos la lista de gente ya asignada
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

    // --- PREPARAMOS LA LISTA PARA EL BUSCADOR ---
    let opcionesHTML = '';
    listaUsuarios.forEach(usuario => {
        opcionesHTML += `<option value="${usuario.nombre}">${usuario.rol}</option>`; 
    });

    const dataListID = `lista-voluntarios-${evento.id}`;

    // --- FORMULARIO RESPONSIVE (Aquí está el arreglo del móvil) ---
    // Usamos 'flex-col' (columna) para móvil y 'md:flex-row' (fila) para pantallas medianas/grandes
    const formularioHTML = !esHistorial ? `
        <form onsubmit="anadirVoluntario(event, ${evento.id})" class="mt-4 flex flex-col md:flex-row gap-3">
            
            <div class="w-full md:w-1/2 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-400">👤</span>
                </div>
                <input 
                    list="${dataListID}" 
                    name="nombre" 
                    class="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pc-orange focus:border-transparent transition shadow-sm" 
                    placeholder="Buscar voluntario..." 
                    required 
                    autocomplete="off"
                >
                <datalist id="${dataListID}">
                    ${opcionesHTML}
                </datalist>
            </div>
            
            <div class="w-full md:w-1/3 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-400">📍</span>
                </div>
                <input 
                    type="text" 
                    name="puesto" 
                    placeholder="Puesto (ej: Cruce)..." 
                    class="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pc-orange focus:border-transparent transition shadow-sm"
                >
            </div>

            <button type="submit" class="w-full md:w-auto bg-pc-blue text-white px-6 py-2.5 rounded-lg text-sm hover:bg-blue-800 font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2">
                <span>+</span> <span class="md:hidden">Añadir</span>
            </button>
        </form>
    ` : '<div class="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 text-center border border-gray-200">🔒 Este evento ha finalizado</div>';

    const bordeColor = esHistorial ? 'border-gray-300 bg-gray-50 opacity-90' : 'border-pc-blue bg-white';
    const iconoPapelera = esHistorial ? 'text-gray-400' : 'text-gray-300 hover:text-red-500';

    return `
        <div class="${bordeColor} rounded-xl shadow-md overflow-hidden border-l-8 transition hover:shadow-lg mb-6">
            <div class="p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-lg md:text-xl font-bold text-gray-800 leading-tight">${evento.titulo}</h2>
                        <div class="flex flex-wrap gap-3 mt-2 text-sm font-medium">
                            <span class="text-pc-orange flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                                📅 ${new Date(evento.fecha).toLocaleDateString()}
                            </span>
                            <span class="text-pc-blue flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                ⏰ ${evento.hora}
                            </span>
                        </div>
                    </div>
                    <button onclick="borrarEvento(${evento.id})" class="${iconoPapelera} transition p-1" title="Eliminar Evento">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
                
                <p class="text-gray-600 text-sm mb-5 italic border-l-4 border-gray-200 pl-3">
                    "${evento.descripcion}"
                </p>

                <hr class="border-gray-100 my-4">

                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        👥 Equipo Asignado
                    </h3>
                    
                    <div class="space-y-2">
                        ${htmlEquipo}
                        ${listaEquipo.length === 0 ? '<div class="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">Sin asignaciones todavía</div>' : ''}
                    </div>

                    ${formularioHTML}
                </div>
            </div>
        </div>
    `;
}

// --- LOGICA DE BASE DE DATOS ---

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

async function anadirVoluntario(e, idEvento) {
    e.preventDefault();
    const inputNombre = e.target.nombre; // Ahora coge el valor del SELECT
    const inputPuesto = e.target.puesto;
    
    const eventoActual = servicios.find(s => s.id === idEvento);

    // Evitamos duplicados: Si ya está en la lista, avisamos
    const yaExiste = eventoActual.equipo.some(v => v.nombre === inputNombre.value);
    if(yaExiste) {
        alert("¡Este voluntario ya está asignado a este servicio!");
        return;
    }

    const nuevoEquipo = [...eventoActual.equipo, { nombre: inputNombre.value, puesto: inputPuesto.value || "General" }];
    const { error } = await sb.from('servicios').update({ equipo: nuevoEquipo }).eq('id', idEvento);
    if (!error) { cargarServiciosDeNube(); }
}

async function borrarVoluntario(idEvento, indexVoluntario) {
    const eventoActual = servicios.find(s => s.id === idEvento);
    const nuevoEquipo = [...eventoActual.equipo];
    nuevoEquipo.splice(indexVoluntario, 1);
    const { error } = await sb.from('servicios').update({ equipo: nuevoEquipo }).eq('id', idEvento);
    if (!error) { cargarServiciosDeNube(); }
}

async function borrarEvento(id) {
    if(confirm("¿Borrar este servicio?")) {
        const { error } = await sb.from('servicios').delete().eq('id', id);
        if (!error) { cargarServiciosDeNube(); }
    }
}

// --- FUNCIÓN PARA PUBLICAR ANUNCIOS (VERSIÓN RECICLAJE) ---
async function publicarAnuncio(e) {
    e.preventDefault();
    
    const mensaje = document.getElementById('anuncio-mensaje').value;
    const tipo = document.getElementById('anuncio-tipo').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "Actualizando...";
    btn.disabled = true;

    // AHORA HACEMOS UPDATE (ACTUALIZAR) SIEMPRE AL ID 1
    const { error } = await sb
        .from('anuncios')
        .update({ 
            mensaje: mensaje, 
            tipo: tipo,
            created_at: new Date() // Actualizamos la fecha para saber cuándo se cambió
        })
        .eq('id', 1); // <--- AQUÍ ESTÁ LA CLAVE: Siempre apuntamos al 1

    if (!error) {
        alert("📢 Tablón actualizado correctamente.");
        document.getElementById('anuncio-mensaje').value = "";
    } else {
        alert("Error al actualizar: " + error.message);
    }

    btn.innerText = "Publicar";
    btn.disabled = false;
}

function abrirModalServicio() { document.getElementById('modal-servicio').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modal-servicio').classList.add('hidden'); }