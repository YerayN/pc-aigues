let todosLosDocs = [];

document.addEventListener('DOMContentLoaded', () => {
    verificarPermisos();
    cargarDocumentos();
});

// 1. SI ERES JEFE, MUESTRA EL FORMULARIO
function verificarPermisos() {
    const rol = localStorage.getItem('pc_rol');
    if (rol === 'admin' || rol === 'jefe') {
        document.getElementById('panel-upload').classList.remove('hidden');
    }
}

// 2. DESCARGAR LISTA
async function cargarDocumentos() {
    const grid = document.getElementById('grid-documentos');
    // grid.innerHTML = '<p class="text-gray-400 col-span-full text-center">Cargando biblioteca...</p>'; // Ya lo tiene el HTML por defecto

    const { data, error } = await sb
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = '<div class="col-span-full text-center p-4 bg-red-50 text-red-500 rounded border border-red-200">Error al cargar documentos.</div>';
        return;
    }

    todosLosDocs = data;
    renderizarDocs(todosLosDocs);
}

// 3. PINTAR TARJETAS
function renderizarDocs(lista) {
    const grid = document.getElementById('grid-documentos');
    const rol = localStorage.getItem('pc_rol');
    const esJefe = (rol === 'admin' || rol === 'jefe');

    grid.innerHTML = '';

    if (!lista || lista.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 border-2 border-dashed border-gray-200 rounded-xl"><p class="text-gray-400 text-lg">📂 No hay documentos en esta categoría.</p></div>';
        return;
    }

    lista.forEach(doc => {
        // Iconos automáticos según URL o categoría
        let icono = '📄';
        if (doc.url_archivo.includes('drive.google')) icono = '☁️';
        else if (doc.url_archivo.includes('dropbox')) icono = '📦';
        else if (doc.url_archivo.endsWith('.pdf')) icono = '📕';
        
        if (doc.categoria === 'normativa') icono = '⚖️';

        // Colores por categoría
        let colorTag = 'bg-gray-100 text-gray-600';
        let textoCat = doc.categoria;

        if (doc.categoria === 'protocolos') { colorTag = 'bg-red-50 text-red-600 border-red-100'; textoCat = 'PROTOCOLO'; }
        if (doc.categoria === 'guias') { colorTag = 'bg-blue-50 text-blue-600 border-blue-100'; textoCat = 'GUÍA'; }
        if (doc.categoria === 'normativa') { colorTag = 'bg-yellow-50 text-yellow-600 border-yellow-100'; textoCat = 'NORMATIVA'; }

        grid.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full group relative">
                <div class="flex justify-between items-start mb-3">
                    <div class="text-3xl">${icono}</div>
                    <span class="text-[10px] font-bold uppercase px-2 py-1 rounded border ${colorTag}">${textoCat}</span>
                </div>
                
                <h3 class="font-bold text-gray-800 text-lg leading-tight mb-2 group-hover:text-pc-blue transition">${doc.titulo}</h3>
                <p class="text-xs text-gray-400 mb-6">Subido el: ${new Date(doc.created_at).toLocaleDateString()}</p>

                <div class="mt-auto flex gap-2">
                    <a href="${doc.url_archivo}" target="_blank" class="flex-1 bg-gray-50 hover:bg-pc-orange hover:text-white text-gray-600 py-2 rounded-lg text-sm font-bold transition border border-gray-200 flex items-center justify-center gap-2">
                        🔗 Abrir
                    </a>
                    ${esJefe ? `
                        <button onclick="borrarDocumento(${doc.id})" class="px-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition border border-red-100" title="Borrar documento">
                            🗑️
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    });
}

// 4. GUARDAR NUEVO ENLACE (CON SWEETALERT)
document.getElementById('form-upload').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Feedback visual en el botón
    const btn = e.target.querySelector('button');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '💾 Guardando...';

    const titulo = document.getElementById('doc-titulo').value;
    const categoria = document.getElementById('doc-categoria').value;
    const url = document.getElementById('doc-url').value;

    const { error } = await sb.from('documentos').insert([{ 
        titulo, categoria, url_archivo: url 
    }]);

    if (!error) {
        // ÉXITO
        Swal.fire({
            icon: 'success',
            title: 'Documento Guardado',
            text: 'Ya está disponible para todos los voluntarios.',
            showConfirmButton: false,
            timer: 1500
        });
        e.target.reset();
        cargarDocumentos();
    } else {
        // ERROR
        Swal.fire('Error', error.message, 'error');
    }
    
    // Restaurar botón
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
});

// 5. BORRAR (CON SWEETALERT)
async function borrarDocumento(id) {
    const result = await Swal.fire({
        title: '¿Eliminar documento?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Rojo
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const { error } = await sb.from('documentos').delete().eq('id', id);
        
        if (!error) {
            cargarDocumentos();
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Documento eliminado' });
        } else {
            Swal.fire('Error', 'No se pudo borrar: ' + error.message, 'error');
        }
    }
}

// 6. FILTROS VISUALES
function filtrarDocs(cat) {
    // Actualizar estilo de botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-pc-blue', 'text-white', 'shadow-sm');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        
        // Si el texto del botón coincide con la categoría seleccionada (o es 'Todos')
        // Truco simple de comparación
        if(
            (cat === 'todos' && btn.innerText === 'Todos') || 
            (cat === 'protocolos' && btn.innerText === 'Protocolos') ||
            (cat === 'guias' && btn.innerText === 'Guías') ||
            (cat === 'normativa' && btn.innerText === 'Normativa')
        ) {
             btn.classList.add('bg-pc-blue', 'text-white', 'shadow-sm');
             btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        }
    });

    if (cat === 'todos') renderizarDocs(todosLosDocs);
    else renderizarDocs(todosLosDocs.filter(d => d.categoria === cat));
}