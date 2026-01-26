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
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 mb-1 text-sm">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-blue-100 text-pc-blue flex items-center justify-center text-xs font-bold">
                        ${voluntario.nombre.charAt(0)}
                    </span>
                    <div>
                        <span class="font-bold text-gray-700">${voluntario.nombre}</span>
                        <span class="text-xs text-gray-400 ml-2">(${voluntario.puesto})</span>
                    </div>
                </div>
                ${!esHistorial ? `<button onclick="borrarVoluntario(${evento.id}, ${iVol})" class="text-red-300 hover:text-red-500 hover:bg-red-50 rounded px-2">×</button>` : ''}
            </div>
        `;
    });

    // --- AQUÍ ESTÁ LA MAGIA DEL DESPLEGABLE ---
    // Creamos las opciones <option> recorriendo la lista de usuarios
    let opcionesHTML = `<option value="" disabled selected>Seleccionar Voluntario...</option>`;
    
    listaUsuarios.forEach(usuario => {
        // Un detalle bonito: Ponemos el rol entre paréntesis
        opcionesHTML += `<option value="${usuario.nombre}">${usuario.nombre} (${usuario.rol})</option>`;
    });

    const formularioHTML = !esHistorial ? `
        <form onsubmit="anadirVoluntario(event, ${evento.id})" class="flex gap-2">
            
            <select name="nombre" class="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-pc-orange cursor-pointer" required>
                ${opcionesHTML}
            </select>
            
            <input type="text" name="puesto" placeholder="Puesto (ej: Cruce)..." class="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-pc-orange">
            <button type="submit" class="bg-pc-blue text-white px-4 rounded text-sm hover:bg-blue-800 font-bold">+</button>
        </form>
    ` : '<p class="text-xs text-gray-400 text-center mt-2">🔒 Evento finalizado</p>';

    const bordeColor = esHistorial ? 'border-gray-300 bg-gray-50' : 'border-pc-blue bg-white';

    return `
        <div class="${bordeColor} rounded-xl shadow-md overflow-hidden border-l-8 transition hover:shadow-lg">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">${evento.titulo}</h2>
                        <p class="text-sm text-pc-orange font-bold flex items-center gap-2 mt-1">
                            📅 ${new Date(evento.fecha).toLocaleDateString()} &nbsp;|&nbsp; ⏰ ${evento.hora}
                        </p>
                        <p class="text-gray-500 text-sm mt-2 italic">"${evento.descripcion}"</p>
                    </div>
                    <button onclick="borrarEvento(${evento.id})" class="text-gray-300 hover:text-red-500 transition" title="Eliminar">🗑️</button>
                </div>
                <hr class="border-gray-100 my-4">
                <div>
                    <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Equipo Asignado</h3>
                    <div class="mb-4 space-y-1">
                        ${htmlEquipo}
                        ${listaEquipo.length === 0 ? '<p class="text-sm text-gray-300 italic">Sin asignaciones.</p>' : ''}
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

function abrirModalServicio() { document.getElementById('modal-servicio').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modal-servicio').classList.add('hidden'); }