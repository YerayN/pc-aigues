document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarDatosUsuario();
    cargarTablon(); // Carga la barra de alertas superior
    comprobarEstadoFichaje(); // Configura el botón de fichar
});

// 1. VERIFICAR SI HAY SESIÓN
function verificarSesion() {
    const nombre = localStorage.getItem('pc_usuario');
    if (!nombre) window.location.href = 'login.html';
}

// 2. CARGAR DATOS EN PANTALLA
function cargarDatosUsuario() {
    const nombre = localStorage.getItem('pc_usuario');
    const rol = localStorage.getItem('pc_rol');
    
    // Poner solo el primer nombre
    const primerNombre = nombre.split(' ')[0];
    const displayNombre = document.getElementById('user-name-display');
    if(displayNombre) displayNombre.innerText = primerNombre;

    // Poner Rol
    const rolTexto = (rol === 'admin' || rol === 'jefe') ? 'Coordinador Jefe' : 'Voluntario';
    const displayRol = document.getElementById('user-role-display');
    if(displayRol) displayRol.innerText = rolTexto;

    // Mostrar botones de jefe
    if (rol === 'jefe' || rol === 'admin') {
        const btnGestion = document.getElementById('btn-gestion');
        const btnMapa = document.getElementById('btn-mapa-admin');
        if(btnGestion) btnGestion.classList.remove('hidden');
        if(btnMapa) btnMapa.classList.remove('hidden');
    }
}

// 3. CARGAR TABLÓN DE ANUNCIOS (Barra Superior)
async function cargarTablon() {
    const { data, error } = await sb.from('anuncios').select('*').eq('id', 1).single();
    const barra = document.getElementById('top-alert-bar');
    const mensaje = document.getElementById('tablon-mensaje');

    if (data && data.mensaje) {
        mensaje.innerText = data.mensaje;
        barra.classList.remove('hidden', 'bg-pc-blue', 'bg-red-600', 'bg-yellow-500', 'animate-pulse');
        barra.classList.add('text-white');

        if (data.tipo === 'urgente') {
            barra.classList.add('bg-red-600', 'animate-pulse');
        } else if (data.tipo === 'aviso') {
            barra.classList.add('bg-yellow-500');
        } else {
            barra.classList.add('bg-pc-blue');
        }
    } else {
        barra.classList.add('hidden');
    }
}

// 4. LÓGICA DE FICHAJE (SweetAlert2)
let sesionFichajeId = null;

async function comprobarEstadoFichaje() {
    const usuario = localStorage.getItem('pc_usuario');
    const { data } = await sb
        .from('registro_horas')
        .select('*')
        .eq('usuario', usuario)
        .is('salida', null)
        .single();

    if (data) {
        sesionFichajeId = data.id;
        actualizarBotonVisual(true, data.actividad);
    } else {
        sesionFichajeId = null;
        actualizarBotonVisual(false);
    }
}

// Esta función se llama desde el HTML al pulsar el botón
async function gestionarClicFichaje() {
    if (sesionFichajeId) {
        // SI YA ESTOY DENTRO -> SALIR
        await realizarSalida();
    } else {
        // SI ESTOY FUERA -> ENTRAR
        await realizarEntrada();
    }
}

async function realizarEntrada() {
    // MODAL BONITO PARA ELEGIR ACTIVIDAD
    const { value: actividad } = await Swal.fire({
        title: '⏱️ Entrar de Guardia',
        text: 'Selecciona tu actividad:',
        input: 'select',
        inputOptions: {
            'Guardia': '🚑 Guardia / Retén',
            'Preventivo': '🎉 Preventivo / Evento',
            'Formación': '🎓 Formación',
            'Taller': '🔧 Taller / Vehículos',
            'Gestión': '💻 Gestión / Oficina'
        },
        inputPlaceholder: 'Selecciona una opción...',
        showCancelButton: true,
        confirmButtonColor: '#22c55e', // Verde
        cancelButtonColor: '#d33',
        confirmButtonText: 'CONFIRMAR ENTRADA',
        cancelButtonText: 'Cancelar'
    });

    if (actividad) {
        const usuario = localStorage.getItem('pc_usuario');
        const ahora = new Date().toISOString();

        const { data, error } = await sb
            .from('registro_horas')
            .insert([{ usuario: usuario, entrada: ahora, actividad: actividad }])
            .select()
            .single();

        if (!error) {
            sesionFichajeId = data.id;
            actualizarBotonVisual(true, actividad);
            
            // Notificación pequeña esquina
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: '¡Turno iniciado correctamente!' });
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

async function realizarSalida() {
    // PREGUNTA DE SEGURIDAD BONITA
    const result = await Swal.fire({
        title: '¿Terminar el turno?',
        text: "Se registrará tu hora de salida ahora mismo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Rojo
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, terminar y salir',
        cancelButtonText: 'Seguir trabajando'
    });

    if (result.isConfirmed) {
        const ahora = new Date().toISOString();
        const { error } = await sb
            .from('registro_horas')
            .update({ salida: ahora })
            .eq('id', sesionFichajeId);

        if (!error) {
            sesionFichajeId = null;
            actualizarBotonVisual(false);
            Swal.fire(
                '¡Turno Finalizado!',
                'Gracias por tu servicio. Descansa.',
                'success'
            );
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

function actualizarBotonVisual(estoyDentro, actividad = "") {
    const btn = document.getElementById('btn-fichar-header');
    const icon = document.getElementById('icono-fichar');
    const txtEstado = document.getElementById('texto-estado');
    const txtAccion = document.getElementById('texto-accion');

    if (!btn) return;

    if (estoyDentro) {
        // ESTILO ROJO (TRABAJANDO)
        btn.className = "w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 border-2 border-white/20 backdrop-blur-sm bg-red-600 hover:bg-red-700 text-white animate-pulse";
        icon.innerText = "⏹";
        txtEstado.innerText = "EN SERVICIO: " + actividad.toUpperCase();
        txtAccion.innerText = "TERMINAR";
    } else {
        // ESTILO VERDE (LIBRE)
        btn.className = "w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 border-2 border-white/20 backdrop-blur-sm bg-green-500 hover:bg-green-600 text-white";
        icon.innerText = "▶";
        txtEstado.innerText = "FUERA DE TURNO";
        txtAccion.innerText = "ENTRAR TURNO";
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}