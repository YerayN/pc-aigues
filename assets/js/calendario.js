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

    const { data: servicios, error } = await sb
        .from('servicios')
        .select('*')
        .order('fecha', { ascending: true }); // Pedimos orden ascendente

    if (error) {
        contenedor.innerHTML = '<p class="text-red-500 text-center">Error de conexión</p>';
        return;
    }

    contenedor.innerHTML = '';
    let eventosMostrados = 0;

    // FECHA DE HOY (Sin hora, para comparar solo días)
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    servicios.forEach(evento => {
        // --- FILTRO 1: ¿ES PASADO? ---
        const fechaEvento = new Date(evento.fecha);
        if (fechaEvento < hoy) {
            return; // Si es viejo, lo saltamos y no lo pintamos
        }

        let estoyConvocado = false;
        let htmlEquipo = '';
        const listaEquipo = evento.equipo || [];

        listaEquipo.forEach(vol => {
            if (vol.nombre.toLowerCase().includes("yeray") && miNombreUsuario.toLowerCase().includes("yeray")) {
                estoyConvocado = true;
            }
            htmlEquipo += `
                <li class="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span class="font-medium text-gray-700">👤 ${vol.nombre}</span>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${vol.puesto}</span>
                </li>
            `;
        });

        // --- FILTRO 2: CHECKBOX "MIS ASIGNACIONES" ---
        if (mostrarSoloMios && !estoyConvocado) return;

        eventosMostrados++;
        let estiloBorde = estoyConvocado ? "border-l-8 border-green-500" : "border-l-8 border-pc-blue";
        let etiquetaConvocado = estoyConvocado ? `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">✅ ESTÁS CONVOCADO</span>` : "";

        const tarjeta = `
            <div class="bg-white rounded-xl shadow-md overflow-hidden ${estiloBorde} transition hover:shadow-lg">
                <div class="p-6 md:flex justify-between gap-6">
                    <div class="md:w-2/3 mb-4 md:mb-0">
                        <div class="flex justify-between items-start">
                            <h2 class="text-xl font-bold text-gray-800 mb-1">${evento.titulo}</h2>
                            ${etiquetaConvocado}
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
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Equipo Asignado</h3>
                        <ul class="space-y-1">
                            ${htmlEquipo}
                            ${listaEquipo.length === 0 ? '<li class="text-xs text-gray-400 italic">Pendiente de asignar</li>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });

    if (eventosMostrados === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-10 bg-white rounded-xl shadow border-2 border-dashed border-gray-300">
                <p class="text-gray-400 text-lg">No hay servicios próximos.</p>
                <p class="text-gray-300 text-sm">Todo el personal libre.</p>
            </div>
        `;
    }
}