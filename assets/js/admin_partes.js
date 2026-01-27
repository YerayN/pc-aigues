document.addEventListener('DOMContentLoaded', () => {
    cargarPartes();
});

// 1. CARGA LA LISTA EN PANTALLA
async function cargarPartes() {
    const contenedor = document.getElementById('contenedor-partes');
    const filtroFecha = document.getElementById('filtro-fecha').value;
    const filtroTipo = document.getElementById('filtro-tipo').value;

    contenedor.innerHTML = '<p class="text-center text-gray-400 py-10 animate-pulse">Buscando expedientes...</p>';

    let query = sb
        .from('partes_incidencia')
        .select('*')
        .order('id', { ascending: false });

    if (filtroFecha) {
        const desde = new Date(filtroFecha);
        const hasta = new Date(filtroFecha);
        hasta.setHours(23, 59, 59);
        query = query.gte('fecha_hora', desde.toISOString()).lte('fecha_hora', hasta.toISOString());
    }
    if (filtroTipo) {
        query = query.eq('tipo', filtroTipo);
    }

    const { data: partes, error } = await query;

    if (error) {
        contenedor.innerHTML = '<p class="text-red-500 text-center">Error al cargar datos.</p>';
        return;
    }

    if (!partes || partes.length === 0) {
        contenedor.innerHTML = `<div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300"><p class="text-gray-400 italic">📂 No se encontraron partes con esos filtros.</p></div>`;
        return;
    }

    contenedor.innerHTML = '';

    partes.forEach(parte => {
        const fechaObj = new Date(parte.fecha_hora);
        const dia = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        let icono = '📝';
        let bgIcono = 'bg-gray-100 text-gray-600';
        
        if (parte.tipo === 'Sanitario') { icono = '🚑'; bgIcono = 'bg-red-100 text-red-600'; }
        if (parte.tipo === 'Incendio') { icono = '🔥'; bgIcono = 'bg-orange-100 text-orange-600'; }
        if (parte.tipo === 'Trafico') { icono = '🚗'; bgIcono = 'bg-blue-100 text-blue-600'; }
        if (parte.tipo === 'Animales') { icono = '🐕'; bgIcono = 'bg-green-100 text-green-600'; }
        if (parte.tipo === 'Preventivo') { icono = '🚧'; bgIcono = 'bg-purple-100 text-purple-600'; }

        const bodyId = `body-${parte.id}`;
        const iconId = `icon-expand-${parte.id}`;

        contenedor.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-3 overflow-hidden hover:shadow-md transition">
                
                <div onclick="toggleParte('${parte.id}')" class="p-4 cursor-pointer flex items-center justify-between bg-white hover:bg-gray-50 transition">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${bgIcono} flex items-center justify-center text-xl shrink-0">
                            ${icono}
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-800 text-sm md:text-base uppercase">
                                ${parte.tipo} <span class="text-gray-400 text-xs font-normal">#${parte.id}</span>
                            </h3>
                            <p class="text-xs text-gray-500 truncate max-w-[150px] md:max-w-md">
                                ${parte.ubicacion}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 text-right">
                        <div>
                            <p class="font-bold text-gray-700 text-sm">${dia}</p>
                            <p class="text-xs text-gray-400">${hora}h</p>
                        </div>
                        <span id="${iconId}" class="text-gray-400 transform transition-transform duration-300">▼</span>
                    </div>
                </div>

                <div id="${bodyId}" class="hidden border-t border-gray-100 p-6 bg-gray-50/50 text-sm text-gray-800">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <p class="text-xs font-bold text-gray-500 uppercase mb-1">Descripción</p>
                            <p class="bg-white p-3 rounded border border-gray-200 italic">${parte.descripcion}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs font-bold text-gray-500 uppercase mb-1">Actuación</p>
                            <p>${parte.acciones_realizadas}</p>
                        </div>
                        ${parte.victimas_info ? `
                        <div class="col-span-2">
                             <p class="text-xs font-bold text-red-500 uppercase mb-1">Afectados</p>
                             <p class="text-red-700">${parte.victimas_info}</p>
                        </div>` : ''}
                        <div>
                            <p class="text-xs font-bold text-gray-500 uppercase mb-1">Recursos</p>
                            <p>${parte.recursos_usados || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-500 uppercase mb-1">Colaboración</p>
                            <p>${parte.organismos_presentes || 'N/A'}</p>
                        </div>
                        <div class="col-span-2 pt-4 mt-2 border-t border-gray-200 text-right text-xs text-gray-500">
                            Informante: <span class="font-bold text-gray-800 uppercase">${parte.usuario_creador}</span>
                        </div>
                        <div class="col-span-2 flex justify-end">
                             <button onclick="imprimirDirecto('${parte.id}')" class="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-black transition flex items-center gap-2">
                                🖨️ Imprimir este informe
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function toggleParte(id) {
    const body = document.getElementById(`body-${id}`);
    const icon = document.getElementById(`icon-expand-${id}`);
    
    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        body.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

// Pequeño helper para imprimir desde dentro de la tarjeta directamente
function imprimirDirecto(id) {
    generarPDF(id);
}

// 3. IMPRESIÓN (LÓGICA SWEETALERT)
async function imprimirPorId() {
    // A. PEDIR ID CON ESTILO
    const { value: id } = await Swal.fire({
        title: '🖨️ Imprimir Informe',
        input: 'number',
        inputLabel: 'Introduce el número de Expediente',
        inputPlaceholder: 'Ej: 7',
        showCancelButton: true,
        confirmButtonText: 'Buscar e Imprimir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#003366',
        cancelButtonColor: '#d33'
    });

    if (!id) return; // Si cancela o no pone nada

    generarPDF(id);
}

// 4. GENERADOR PDF (Lógica compartida)
async function generarPDF(id) {
    // A. Buscamos los datos
    const { data: parte, error } = await sb
        .from('partes_incidencia')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !parte) {
        Swal.fire({
            icon: 'error',
            title: 'No encontrado',
            text: `No existe ningún parte con el ID #${id}`,
            confirmButtonColor: '#003366'
        });
        return;
    }

    const fechaObj = new Date(parte.fecha_hora);
    const dia = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const logoUrl = "../assets/img/escudo.png"; // Asegúrate que esta ruta es correcta en tu proyecto

    const ventana = window.open('', '_blank', 'width=900,height=1000');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Informe #${parte.id}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; max-width: 850px; margin: 0 auto; line-height: 1.5; }
                .header-container { display: flex; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; gap: 20px; }
                .logo-img { width: 80px; height: auto; }
                .header-text { flex: 1; }
                h1 { font-size: 26px; margin: 0; text-transform: uppercase; color: #2c3e50; letter-spacing: 1px; }
                h2 { font-size: 16px; margin: 5px 0 0; font-weight: normal; color: #555; text-transform: uppercase; }
                .meta { font-size: 12px; color: #888; margin-top: 5px; text-align: right; }
                .info-bar { display: flex; justify-content: space-between; background: #f4f6f7; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #e1e4e8; }
                .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #7f8c8d; letter-spacing: 1px; margin-bottom: 4px; }
                .value { font-size: 16px; font-weight: bold; color: #2c3e50; }
                .section { margin-bottom: 25px; }
                .box { border: 1px solid #ccc; padding: 15px; background: #fff; min-height: 50px; border-radius: 4px; white-space: pre-wrap; font-size: 14px; }
                .box-red { border: 1px solid #e74c3c; background: #fdedec; color: #c0392b; }
                .label-red { color: #c0392b; }
                .footer { margin-top: 50px; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
                .firma-box { border-top: 1px solid #000; width: 220px; text-align: center; font-size: 11px; padding-top: 8px; color: #555; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <img src="${logoUrl}" class="logo-img" alt="Logo PC">
                <div class="header-text">
                    <h1>Protección Civil Aigües</h1>
                    <h2>Informe Oficial de Intervención</h2>
                </div>
                <div class="meta">
                    <div>Expediente <strong>#${parte.id}</strong></div>
                    <div>${new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="info-bar">
                <div><div class="label">TIPO DE INCIDENTE</div><div class="value">${parte.tipo.toUpperCase()}</div></div>
                <div style="text-align: right;"><div class="label">FECHA Y HORA DEL SUCESO</div><div class="value">${dia} &bull; ${hora}h</div></div>
            </div>

            <div class="section"><div class="label">UBICACIÓN EXACTA</div><div class="value" style="font-size: 15px; margin-bottom: 5px;">📍 ${parte.ubicacion}</div></div>
            <div class="section"><div class="label">DESCRIPCIÓN DE LOS HECHOS</div><div class="box">"${parte.descripcion}"</div></div>
            ${parte.victimas_info ? `<div class="section"><div class="label label-red">DATOS DE AFECTADOS / VÍCTIMAS</div><div class="box box-red"><strong>⚠️ ATENCIÓN:</strong>\n${parte.victimas_info}</div></div>` : ''}
            <div class="section"><div class="label">ACTUACIÓN REALIZADA</div><div class="box" style="background: #fdfdfd;">${parte.acciones_realizadas}</div></div>
            <div style="display: flex; gap: 20px;">
                <div class="section" style="flex: 1;"><div class="label">RECURSOS UTILIZADOS</div><div style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 14px;">${parte.recursos_usados || 'No especificado'}</div></div>
                <div class="section" style="flex: 1;"><div class="label">COLABORACIÓN CON OTROS ORGANISMOS</div><div style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 14px;">${parte.organismos_presentes || 'Sin colaboración externa'}</div></div>
            </div>

            <div class="footer">
                <div><div class="label">VOLUNTARIO INFORMANTE</div><div class="value" style="text-transform: uppercase; font-size: 14px;">${parte.usuario_creador}</div><div style="font-size: 11px; color: #888; margin-top: 4px;">Agrupación de Voluntarios de Protección Civil</div></div>
                <div class="firma-box">Firma, Sello y Fecha - Coordinador Jefe</div>
            </div>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    
    ventana.document.close();
}