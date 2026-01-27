const miNombreUsuario = localStorage.getItem('pc_usuario') || "";

document.addEventListener('DOMContentLoaded', () => {
    cargarCalendarioNube();
    const checkbox = document.getElementById('filtro-mios');
    if(checkbox) checkbox.addEventListener('change', cargarCalendarioNube);
});

async function cargarCalendarioNube() {
    const contenedor = document.getElementById('contenedor-calendario');
    const mostrarSoloMios = document.getElementById('filtro-mios')?.checked;

    contenedor.innerHTML = '<p class="text-center text-gray-400 mt-10 animate-pulse">Sincronizando calendario...</p>';

    // 1. PEDIMOS LOS DATOS
    const { data: datosSinOrden, error } = await sb
        .from('servicios')
        .select('*');

    if (error) {
        contenedor.innerHTML = '<div class="text-center p-4 bg-red-50 text-red-500 rounded border border-red-200">Error de conexión con el calendario.</div>';
        return;
    }

    // 2. ORDENACIÓN INTELIGENTE (FECHA + HORA)
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
        // Opcional: Si quieres ver eventos de hoy aunque la hora haya pasado, deja esto.
        // Si quieres ocultar pasados estrictos, usa fechaEvento < hoy
        if (fechaEvento < hoy) return; 

        // Analizar mi estado
        const listaEquipo = evento.equipo || [];
        const listaCandidatos = evento.candidatos || [];

        const estoyDentro = listaEquipo.some(vol => vol.nombre === miNombreUsuario);
        const estoyPendiente = listaCandidatos.some(cand => cand.nombre === miNombreUsuario);

        // Filtro visual
        if (mostrarSoloMios && !estoyDentro && !estoyPendiente) return;

        eventosMostrados++;

        // DISEÑO DE ESTADO
        let estadoHTML = '';
        let bordeColor = 'border-l-pc-blue'; // Por defecto azul
        
        if (estoyDentro) {
            bordeColor = 'border-l-green-500';
            estadoHTML = `<span class="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200 shadow-sm">✅ ASIGNADO</span>`;
        } else if (estoyPendiente) {
            bordeColor = 'border-l-yellow-500';
            estadoHTML = `<span class="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200 shadow-sm">⏳ PENDIENTE</span>`;
        } else {
            // Botón para apuntarse
            estadoHTML = `
                <button onclick="solicitarAsistencia(${evento.id})" class="bg-pc-blue hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition transform active:scale-95 flex items-center gap-2">
                    🙋‍♂️ ME APUNTO
                </button>
            `;
        }

        // Generar lista de equipo visual
        let htmlEquipo = '';
        listaEquipo.forEach(vol => {
            htmlEquipo += `
                <li class="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span class="font-medium text-gray-700">👤 ${vol.nombre}</span>
                    <span class="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase font-bold tracking-wider">${vol.puesto}</span>
                </li>
            `;
        });

        // Formato de fecha bonito
        const fechaBonita = new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        const tarjeta = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-l-8 ${bordeColor} transition hover:shadow-md">
                <div class="p-6 md:flex justify-between gap-6">
                    <div class="md:w-2/3 mb-4 md:mb-0">
                        <div class="flex justify-between items-start mb-2">
                            <h2 class="text-xl font-bold text-gray-800 capitalize">${evento.titulo}</h2>
                            <div>${estadoHTML}</div>
                        </div>
                        <div class="flex items-center gap-4 text-sm text-gray-600 font-medium mb-4">
                            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 capitalize">📅 ${fechaBonita}</span>
                            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">⏰ ${evento.hora}h</span>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 relative">
                            <span class="absolute top-2 left-2 text-blue-200 text-4xl leading-none select-none">“</span>
                            <p class="text-gray-700 text-sm italic relative z-10 pl-4">${evento.descripcion}</p>
                        </div>
                    </div>
                    <div class="md:w-1/3 bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col">
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-200 pb-2">Equipo Confirmado</h3>
                        <ul class="space-y-1 flex-1">
                            ${htmlEquipo}
                            ${listaEquipo.length === 0 ? '<li class="text-xs text-gray-400 italic text-center py-4">Sin asignaciones aún</li>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });

    if (eventosMostrados === 0) {
        contenedor.innerHTML = `<div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300"><p class="text-gray-400 text-lg">📭 No hay servicios activos.</p></div>`;
    }
}

// --- FUNCIÓN PARA APUNTARSE (CON SWEETALERT) ---
async function solicitarAsistencia(idEvento) {
    
    // 1. PREGUNTA BONITA
    const result = await Swal.fire({
        title: '¿Quieres apuntarte?',
        text: "Confirma que tienes disponibilidad para este día y hora.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#003366', // Azul PC
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, contar conmigo',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    // Mostrar carga
    Swal.fire({
        title: 'Enviando solicitud...',
        didOpen: () => Swal.showLoading()
    });

    // 2. Buscamos el evento actual para no machacar datos
    const { data: evento, error: errLectura } = await sb.from('servicios').select('*').eq('id', idEvento).single();
    
    if (errLectura) {
        Swal.fire('Error', 'No se pudo leer el evento.', 'error');
        return;
    }

    // 3. Añadimos al usuario a la lista de candidatos (evitando duplicados)
    const actuales = evento.candidatos || [];
    const yaEstoy = actuales.some(c => c.nombre === miNombreUsuario);
    
    if (yaEstoy) {
        Swal.fire('Información', 'Ya habías enviado una solicitud para este evento.', 'info');
        cargarCalendarioNube(); // Refrescar por si acaso
        return;
    }

    const nuevaLista = [...actuales, { nombre: miNombreUsuario, fecha: new Date() }];

    // 4. Guardamos en Supabase
    const { error } = await sb
        .from('servicios')
        .update({ candidatos: nuevaLista })
        .eq('id', idEvento);

    if (!error) {
        // ÉXITO
        Swal.fire({
            icon: 'success',
            title: '¡Solicitud Enviada!',
            text: 'El Jefe ha recibido tu disponibilidad. Espera a ser confirmado.',
            confirmButtonColor: '#003366'
        }).then(() => {
            cargarCalendarioNube(); // Recargar para ver el estado "PENDIENTE"
        });
    } else {
        Swal.fire('Error', 'Hubo un fallo al enviar la solicitud: ' + error.message, 'error');
    }
}