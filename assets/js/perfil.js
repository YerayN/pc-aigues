let miID = null; // Variable global para saber quiénes somos

document.addEventListener('DOMContentLoaded', () => {
    cargarPerfil();
});

async function cargarPerfil() {
    miID = localStorage.getItem('pc_id');

    if (!miID) {
        window.location.href = 'login.html';
        return;
    }

    const { data: voluntario, error } = await sb
        .from('perfiles')
        .select('*')
        .eq('id', miID)
        .single();

    if (error) {
        alert("Error al cargar ficha.");
        return;
    }

    if (voluntario) {
        // 1. Rellenar datos visuales
        document.getElementById('nombre-header').innerText = voluntario.nombre;
        
        let rolTexto = 'Voluntario';
        if(voluntario.rol === 'admin') rolTexto = 'Administrador del Sistema';
        if(voluntario.rol === 'jefe') rolTexto = 'Jefe de Agrupación';
        
        document.getElementById('rol-header').innerText = rolTexto;

        // 2. Rellenar Inputs
        document.getElementById('perfil-nombre').value = voluntario.nombre;
        document.getElementById('perfil-dni').value = voluntario.dni || "";
        document.getElementById('perfil-telefono').value = voluntario.telefono || "";
        
        const fechaAlta = new Date(voluntario.created_at).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        document.getElementById('perfil-fecha').value = fechaAlta;

        // 3. GESTIONAR PERMISOS (Aquí está la clave)
        // Si el rol es 'admin' O 'jefe', desbloqueamos todo
        if (voluntario.rol === 'admin' || voluntario.rol === 'jefe') {
            activarModoEdicion();
        }
    }
}

function activarModoEdicion() {
    // Lista de campos que queremos desbloquear
    const camposEditables = ['perfil-nombre', 'perfil-dni', 'perfil-telefono'];
    const iconosCandado = document.querySelectorAll('.opacity-50'); // Los candados 🔒

    // 1. Quitar candados visualmente
    iconosCandado.forEach(icono => icono.innerText = '✏️'); // Cambiamos candado por lápiz

    // 2. Desbloquear inputs
    camposEditables.forEach(id => {
        const input = document.getElementById(id);
        input.removeAttribute('readonly');
        
        // Cambiamos estilo: de Gris Bloqueado a Blanco Editable
        input.classList.remove('bg-gray-100', 'cursor-not-allowed', 'text-gray-600');
        input.classList.add('bg-white', 'text-gray-800', 'focus:ring-2', 'focus:ring-pc-orange');
    });

    // 3. Mostrar el botón de guardar
    document.getElementById('btn-container').classList.remove('hidden');
}

// --- FUNCIÓN PARA GUARDAR EN BASE DE DATOS ---
async function guardarCambios() {
    const btn = document.querySelector('#btn-container button');
    const textoOriginal = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Guardando...';

    const nuevosDatos = {
        nombre: document.getElementById('perfil-nombre').value,
        dni: document.getElementById('perfil-dni').value,
        telefono: document.getElementById('perfil-telefono').value
    };

    const { error } = await sb
        .from('perfiles')
        .update(nuevosDatos)
        .eq('id', miID);

    if (error) {
        alert("Error al guardar: " + error.message);
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    } else {
        // Éxito visual
        btn.classList.remove('bg-pc-blue', 'hover:bg-blue-800');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
        btn.innerHTML = '<span>✅</span> ¡Datos Actualizados!';
        
        // Actualizamos el nombre en el header por si cambió
        document.getElementById('nombre-header').innerText = nuevosDatos.nombre;
        
        // Actualizamos localStorage por si cambió el nombre
        localStorage.setItem('pc_usuario', nuevosDatos.nombre);

        setTimeout(() => {
            btn.classList.add('bg-pc-blue', 'hover:bg-blue-800');
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }, 2000);
    }
}