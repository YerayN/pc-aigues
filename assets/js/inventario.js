const miNombre = localStorage.getItem('pc_usuario') || "Desconocido";

document.addEventListener('DOMContentLoaded', () => {
    verificarJefe();
    cargarTodo();
});

function verificarJefe() {
    const rol = localStorage.getItem('pc_rol');
    if (rol === 'admin' || rol === 'jefe') {
        document.getElementById('panel-jefe').classList.remove('hidden');
    }
}

async function cargarTodo() {
    await Promise.all([
        cargarAlmacen(),
        cargarMisPrestamos(),
        cargarPrestamosActivos()
    ]);
}

// 1. CARGAR ALMACÉN
async function cargarAlmacen() {
    const contenedor = document.getElementById('grid-almacen');
    const rol = localStorage.getItem('pc_rol');
    const esJefe = (rol === 'admin' || rol === 'jefe');

    // TABLA: 'inventario_material'
    const { data: items, error } = await sb.from('inventario_material').select('*').order('nombre');

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<p class="text-red-500 text-center col-span-full">Error de conexión con BBDD</p>';
        return;
    }

    if (!items || items.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-400 italic text-center col-span-full">Almacén vacío.</p>';
        return;
    }

    contenedor.innerHTML = '';
    items.forEach(item => {
        const sinStock = item.stock_disponible <= 0;
        
        // Estilos dinámicos
        const claseBoton = sinStock 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200 shadow-sm transition transform active:scale-95';

        contenedor.innerHTML += `
            <div class="bg-white p-3 md:p-4 rounded-xl border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-md transition h-full relative group">
                
                <div class="text-center mb-2">
                    <div class="text-2xl md:text-3xl mb-1">📦</div>
                    <h3 class="font-bold text-gray-800 text-sm md:text-base leading-tight line-clamp-2 h-10 md:h-auto flex items-center justify-center">
                        ${item.nombre}
                    </h3>
                </div>
                
                <div class="mt-auto">
                    <p class="text-[10px] md:text-xs text-gray-400 text-center mb-2 uppercase font-bold tracking-wider">
                        Quedan: <span class="text-sm md:text-base ${sinStock ? 'text-red-500' : 'text-blue-600'}">${item.stock_disponible}</span><span class="text-gray-300">/${item.stock_total}</span>
                    </p>
                    
                    <button onclick="cogerItem(${item.id}, '${item.nombre}', ${item.stock_disponible})" ${sinStock ? 'disabled' : ''} class="w-full py-2 rounded-lg font-bold text-xs md:text-sm border transition flex justify-center items-center gap-1 ${claseBoton}">
                        ${sinStock ? 'Agotado' : '✋ Coger'}
                    </button>

                    ${esJefe ? `
                        <div class="mt-3 pt-2 border-t border-gray-100 flex gap-1 justify-center">
                            <button onclick="darBajaMaterial(${item.id}, ${item.stock_total}, ${item.stock_disponible})" class="flex-1 text-[10px] text-orange-500 hover:text-orange-700 font-bold border border-orange-100 bg-orange-50 px-1 py-1 rounded transition hover:bg-orange-100" title="Resta 1 al stock">
                                📉 -1
                            </button>
                            <button onclick="darAltaMaterial(${item.id}, ${item.stock_total}, ${item.stock_disponible})" class="flex-1 text-[10px] text-blue-500 hover:text-blue-700 font-bold border border-blue-100 bg-blue-50 px-1 py-1 rounded transition hover:bg-blue-100" title="Suma 1 al stock">
                                📈 +1
                            </button>
                            <button onclick="eliminarMaterial(${item.id})" class="text-[10px] text-red-500 hover:text-red-700 font-bold border border-red-100 bg-red-50 px-2 py-1 rounded transition hover:bg-red-100" title="Eliminar artículo completo">
                                🗑️
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
}

// 2. COGER UN OBJETO
async function cogerItem(id, nombre, stockActual) {
    if (stockActual <= 0) return;

    // Toast de carga
    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
    });

    // A. Restar Stock
    const { error: errUpdate } = await sb.from('inventario_material')
        .update({ stock_disponible: stockActual - 1 })
        .eq('id', id);

    if(errUpdate) return Swal.fire('Error', 'No se pudo actualizar stock', 'error');

    // B. Crear Préstamo
    const { error: errInsert } = await sb.from('inventario_prestamos').insert([{
        item_id: id,
        nombre_item: nombre,
        usuario: miNombre,
        devuelto: false, // Usamos booleano como en tu lógica
        fecha_cogida: new Date().toISOString()
    }]);

    if (!errInsert) {
        Toast.fire({ icon: 'success', title: `Has cogido: ${nombre}` });
        cargarTodo();
    }
}

// 3. CARGAR MIS OBJETOS
async function cargarMisPrestamos() {
    const contenedor = document.getElementById('mis-prestamos');
    
    // TABLA: 'inventario_prestamos', COLUMNA: 'devuelto' (false)
    const { data: misCosas } = await sb.from('inventario_prestamos')
        .select('*')
        .eq('usuario', miNombre)
        .eq('devuelto', false);

    if (!misCosas || misCosas.length === 0) {
        contenedor.innerHTML = '<div class="col-span-full py-6 text-center bg-white rounded-lg border border-dashed border-orange-200"><p class="text-gray-400 text-sm italic">🎒 Tu mochila está vacía.</p></div>';
        return;
    }

    contenedor.innerHTML = '';
    misCosas.forEach(prestamo => {
        const hora = new Date(prestamo.fecha_cogida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        contenedor.innerHTML += `
            <div class="flex justify-between items-center bg-white p-3 md:p-4 rounded-xl border-l-4 border-l-orange-500 border border-gray-100 shadow-sm">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg md:text-xl shrink-0">
                        🎒
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-gray-800 text-sm md:text-base truncate">${prestamo.nombre_item}</p>
                        <p class="text-[10px] md:text-xs text-gray-400">Hora: ${hora}h</p>
                    </div>
                </div>
                <button onclick="devolverItem(${prestamo.id}, ${prestamo.item_id})" class="ml-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] md:text-xs font-bold px-3 py-1.5 md:py-2 rounded-lg transition border border-orange-200 whitespace-nowrap active:scale-95">
                    Devolver ↩
                </button>
            </div>
        `;
    });
}

// 4. DEVOLVER UN OBJETO
async function devolverItem(idPrestamo, idMaterial) {
    // Confirmación bonita
    /* const result = await Swal.fire({
        title: '¿Devolver material?',
        text: "¿Confirmas que lo has dejado en su sitio?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#003366',
        confirmButtonText: 'Sí, devuelto'
    });
    if (!result.isConfirmed) return; */
    
    // Para ser más rápidos, usaremos un Toast directo al clicar, es más ágil para el voluntario
    
    // A. Marcar como devuelto
    await sb.from('inventario_prestamos').update({ devuelto: true }).eq('id', idPrestamo);

    // B. Recuperar info del item para sumar stock
    const { data: item } = await sb.from('inventario_material').select('stock_disponible').eq('id', idMaterial).single();
    
    if (item) {
        await sb.from('inventario_material').update({ stock_disponible: item.stock_disponible + 1 }).eq('id', idMaterial);
    }

    // Feedback
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    Toast.fire({ icon: 'info', title: 'Material devuelto' });

    cargarTodo();
}

// 5. ZONA JEFE: PRESTAMOS ACTIVOS
async function cargarPrestamosActivos() {
    const lista = document.getElementById('lista-morosos');
    const rol = localStorage.getItem('pc_rol');
    if (rol !== 'admin' && rol !== 'jefe') return;

    const { data: activos } = await sb.from('inventario_prestamos')
        .select('*')
        .eq('devuelto', false)
        .order('fecha_cogida', {ascending: false});

    lista.innerHTML = '';
    if (!activos || activos.length === 0) {
        lista.innerHTML = '<li class="text-green-600 italic p-2 text-xs text-center">Todo el material está en base.</li>';
        return;
    }

    activos.forEach(p => {
        lista.innerHTML += `
            <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span class="truncate pr-2 text-sm"><span class="font-bold text-gray-700">${p.usuario}</span> <span class="text-gray-400 text-xs">tiene</span> <span class="text-blue-600 font-bold">${p.nombre_item}</span></span>
            </li>
        `;
    });
}

// 6. ZONA JEFE: CREAR ITEM
const formNuevo = document.getElementById('form-nuevo-item');
if(formNuevo) {
    formNuevo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nuevo-nombre').value;
        const stock = parseInt(document.getElementById('nuevo-stock').value);

        const { error } = await sb.from('inventario_material').insert([{
            nombre: nombre,
            stock_total: stock,
            stock_disponible: stock
        }]);

        if (!error) {
            e.target.reset();
            cargarTodo();
            Swal.fire({ icon: 'success', title: 'Añadido', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    });
}

// 7. GESTIÓN DE STOCK (-1, +1, DELETE)

// A. ELIMINAR ARTÍCULO (VERSIÓN NUCLEAR: BORRA HISTORIAL Y ARTÍCULO)
async function eliminarMaterial(id) {
    const result = await Swal.fire({
        title: '¿Eliminar artículo?',
        html: "Se borrará el artículo y <b>todo su historial de préstamos</b>.<br>No se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar todo',
        cancelButtonText: 'Cancelar'
    });

    if(result.isConfirmed) {
        // PASO 1: Borrar primero el historial (préstamos) de ese artículo
        // Si no hacemos esto, la base de datos bloquea el borrado por seguridad
        const { error: errorHistorial } = await sb
            .from('inventario_prestamos')
            .delete()
            .eq('item_id', id);

        if (errorHistorial) {
            Swal.fire('Error', 'No se pudo borrar el historial: ' + errorHistorial.message, 'error');
            return;
        }

        // PASO 2: Ahora que está "limpio", borramos el artículo
        const { error } = await sb
            .from('inventario_material')
            .delete()
            .eq('id', id);

        if(!error) {
            cargarTodo(); // Recargar la pantalla
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Artículo eliminado' });
        } else {
            Swal.fire('Error', 'No se pudo eliminar el ítem: ' + error.message, 'error');
        }
    }
}

// B. RESTAR STOCK (-1)
async function darBajaMaterial(id, total, disponible) {
    if(disponible <= 0) return Swal.fire('Error', 'No hay stock disponible para restar.', 'warning');
    
    // Sin confirmación para ser rápido, o con toast
    const { error } = await sb.from('inventario_material').update({
        stock_total: total - 1,
        stock_disponible: disponible - 1
    }).eq('id', id);

    if(!error) {
        cargarTodo();
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
        Toast.fire({ icon: 'warning', title: '-1 Stock' });
    }
}

// C. SUMAR STOCK (+1)
async function darAltaMaterial(id, total, disponible) {
    const { error } = await sb.from('inventario_material').update({
        stock_total: total + 1,
        stock_disponible: disponible + 1
    }).eq('id', id);

    if(!error) {
        cargarTodo();
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
        Toast.fire({ icon: 'success', title: '+1 Stock' });
    }
}