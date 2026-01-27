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
    grid.innerHTML = '<p class="text-gray-400 col-span-full text-center">Cargando biblioteca...</p>';

    const { data, error } = await sb
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = '<p class="text-red-500 text-center">Error de conexión.</p>';
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

    if (lista.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">📂 No hay documentos aquí.</div>';
        return;
    }

    lista.forEach(doc => {
        // Iconos automáticos
        let icono = '📄';
        if (doc.url_archivo.includes('drive.google')) icono = '☁️';
        if (doc.categoria === 'normativa') icono = '⚖️';

        // Colores por categoría
        let colorTag = 'bg-gray-100 text-gray-600';
        if (doc.categoria === 'protocolos') colorTag = 'bg-red-50 text-red-600 border-red-100';
        if (doc.categoria === 'guias') colorTag = 'bg-blue-50 text-blue-600 border-blue-100';
        if (doc.categoria === 'normativa') colorTag = 'bg-yellow-50 text-yellow-600 border-yellow-100';

        grid.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full group">
                <div class="flex justify-between items-start mb-3">
                    <div class="text-3xl">${icono}</div>
                    <span class="text-[10px] font-bold uppercase px-2 py-1 rounded border ${colorTag}">${doc.categoria}</span>
                </div>
                
                <h3 class="font-bold text-gray-800 text-lg leading-tight mb-2">${doc.titulo}</h3>
                <p class="text-xs text-gray-400 mb-6">Añadido: ${new Date(doc.created_at).toLocaleDateString()}</p>

                <div class="mt-auto flex gap-2">
                    <a href="${doc.url_archivo}" target="_blank" class="flex-1 bg-gray-50 hover:bg-pc-orange hover:text-white text-gray-600 py-2 rounded-lg text-sm font-bold transition border border-gray-200 flex items-center justify-center gap-2">
                        🔗 Abrir
                    </a>
                    ${esJefe ? `<button onclick="borrarDocumento(${doc.id})" class="px-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition border border-red-100">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });
}

// 4. GUARDAR NUEVO ENLACE
document.getElementById('form-upload').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titulo = document.getElementById('doc-titulo').value;
    const categoria = document.getElementById('doc-categoria').value;
    const url = document.getElementById('doc-url').value;

    const { error } = await sb.from('documentos').insert([{ 
        titulo, categoria, url_archivo: url 
    }]);

    if (!error) {
        alert("✅ Enlace guardado.");
        e.target.reset();
        cargarDocumentos();
    } else {
        alert("Error: " + error.message);
    }
});

// 5. BORRAR
async function borrarDocumento(id) {
    if(confirm("¿Borrar este documento?")) {
        await sb.from('documentos').delete().eq('id', id);
        cargarDocumentos();
    }
}

// 6. FILTROS VISUALES
function filtrarDocs(cat) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-pc-blue', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        if(btn.innerText.toLowerCase().includes(cat) || (cat==='todos' && btn.innerText==='Todos')) {
             btn.classList.add('bg-pc-blue', 'text-white');
             btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        }
    });

    if (cat === 'todos') renderizarDocs(todosLosDocs);
    else renderizarDocs(todosLosDocs.filter(d => d.categoria === cat));
}