const miNombreUsuario = localStorage.getItem('pc_usuario') || "";

document.addEventListener('DOMContentLoaded', () => {
    cargarCalendarioNube();
    const checkbox = document.getElementById('filtro-mios');
    if(checkbox) checkbox.addEventListener('change', cargarCalendarioNube);
});

async function cargarCalendarioNube() {
    const contenedor = document.getElementById('contenedor-calendario');
    const mostrarSoloMios = document.getElementById('filtro-mios')?.checked;

    contenedor.innerHTML = '<p class="text-center text-gray-400 mt-10">Sincronizando calendario...</p>';

    // 1. PEDIMOS LOS DATOS SIN ORDENAR AL SERVIDOR
    const { data: datosSinOrden, error } = await sb
        .from('servicios')
        .select('*');

    if (error) {
        contenedor.innerHTML = '<p class="text-red-500 text-center">Error de conexión</p>';
        return;
    }

    // 2. ORDENACIÓN INTELIGENTE (FECHA + HORA)
    // Esto arregla el problema: Compara el momento exacto
    const servicios = datosSinOrden.sort((a, b) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`);
        const tiempoB = new Date(`${b.fecha}T${b.hora}`);
        return tiempoA - tiempoB;
    });

    contenedor.innerHTML = '';
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    let eventosMostrados = 0;

    servicios.forEach(evento => {
        const fechaEvento = new Date(evento.fecha);
        if (fechaEvento < hoy) return; // Ocultar pasados

        // Analizar mi estado en este evento
        const listaEquipo = evento.equipo || [];
        const listaCandidatos = evento.candidatos || [];

        const estoyDentro = listaEquipo.some(vol => vol.nombre === miNombreUsuario);
        const estoyPendiente = listaCandidatos.some(cand => cand.nombre === miNombreUsuario);

        // Filtro visual
        if (mostrarSoloMios && !estoyDentro && !estoyPendiente) return;

        eventosMostrados++;

        // DISEÑO DE ESTADO
        let estadoHTML = '';
        let bordeColor = 'border-pc-blue';
        
        if (estoyDentro) {
            bordeColor = 'border-green-500';
            estadoHTML = `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">✅ ASIGNADO</span>`;
        } else if (estoyPendiente) {
            bordeColor = 'border-yellow-500';
            estadoHTML = `<span class="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200">⏳ PENDIENTE</span>`;
        } else {
            // Botón para apuntarse
            estadoHTML = `
                <button onclick="solicitarAsistencia(${evento.id})" class="bg-pc-blue hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition transform active:scale-95 flex items-center gap-1">
                    🙋‍♂️ Me apunto
                </button>
            `;
        }

        // Generar lista de equipo visual
        let htmlEquipo = '';
        listaEquipo.forEach(vol => {
            htmlEquipo += `
                <li class="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span class="font-medium text-gray-700">👤 ${vol.nombre}</span>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${vol.puesto}</span>
                </li>
            `;
        });

        const tarjeta = `
            <div class="bg-white rounded-xl shadow-md overflow-hidden border-l-8 ${bordeColor} transition hover:shadow-lg">
                <div class="p-6 md:flex justify-between gap-6">
                    <div class="md:w-2/3 mb-4 md:mb-0">
                        <div class="flex justify-between items-start mb-2">
                            <h2 class="text-xl font-bold text-gray-800">${evento.titulo}</h2>
                            <div>${estadoHTML}</div>
                        </div>
                        <div class="flex items-center gap-4 text-sm text-gray-600 font-medium mb-3">
                            <span class="flex items-center gap-1">📅 ${new Date(evento.fecha).toLocaleDateString()}</span>
                            <span class="flex items-center gap-1">⏰ ${evento.hora}</span>
                        </div>
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <p class="text-gray-700 text-sm italic">"${evento.descripcion}"</p>
                        </div>
                    </div>
                    <div class="md:w-1/3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Equipo Confirmado</h3>
                        <ul class="space-y-1">
                            ${htmlEquipo}
                            ${listaEquipo.length === 0 ? '<li class="text-xs text-gray-400 italic">Sin asignaciones aún</li>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });

    if (eventosMostrados === 0) {
        contenedor.innerHTML = `<div class="text-center py-10 bg-white rounded-xl shadow"><p class="text-gray-400">No hay servicios disponibles.</p></div>`;
    }
}

// --- FUNCIÓN PARA APUNTARSE ---
async function solicitarAsistencia(idEvento) {
    if(!confirm("¿Confirmas que tienes disponibilidad para este servicio?")) return;

    // 1. Buscamos el evento actual
    const { data: evento } = await sb.from('servicios').select('*').eq('id', idEvento).single();
    
    // 2. Añadimos al usuario a la lista de candidatos
    const actuales = evento.candidatos || [];
    const nuevaLista = [...actuales, { nombre: miNombreUsuario, fecha: new Date() }];

    // 3. Guardamos en Supabase
    const { error } = await sb
        .from('servicios')
        .update({ candidatos: nuevaLista })
        .eq('id', idEvento);

    if (!error) {
        alert("Solicitud enviada al Jefe. Espera confirmación.");
        cargarCalendarioNube();
    } else {
        alert("Error al enviar solicitud");
    }
}