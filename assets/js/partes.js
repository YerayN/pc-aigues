document.addEventListener('DOMContentLoaded', () => {
    prepararFormulario();
});

function prepararFormulario() {
    const usuario = localStorage.getItem('pc_usuario') || "Anónimo";
    document.getElementById('parte-usuario').value = usuario;

    const ahora = new Date();
    const fechaLocal = new Date(ahora.getTime() - (ahora.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('parte-fecha').value = fechaLocal;
}

document.getElementById('form-parte').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. VALIDACIÓN VISUAL (Antes de enviar nada)
    const ubicacion = document.getElementById('parte-ubicacion');
    const descripcion = document.getElementById('parte-descripcion');
    const acciones = document.getElementById('parte-acciones');

    // Comprobamos campos obligatorios uno a uno para avisar con precisión
    if (!ubicacion.value.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'Falta la Ubicación',
            text: 'Por favor, indica dónde ocurrió el incidente.',
            confirmButtonColor: '#FF6600'
        }).then(() => setTimeout(() => ubicacion.focus(), 300)); // Pone el cursor ahí
        return;
    }

    if (!descripcion.value.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'Descripción vacía',
            text: 'Debes explicar brevemente qué ha sucedido.',
            confirmButtonColor: '#FF6600'
        }).then(() => setTimeout(() => descripcion.focus(), 300));
        return;
    }

    if (!acciones.value.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin Actuación',
            text: 'Es obligatorio registrar qué intervención habéis realizado.',
            confirmButtonColor: '#FF6600'
        }).then(() => setTimeout(() => acciones.focus(), 300));
        return;
    }

    // 2. PREPARAR ENVÍO
    const btn = e.target.querySelector('button');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin">🔄</span> Enviando...`;

    try {
        const fechaInput = document.getElementById('parte-fecha').value;
        const fechaParaGuardar = new Date(fechaInput).toISOString();

        const nuevoParte = {
            usuario_creador: document.getElementById('parte-usuario').value,
            fecha_hora: fechaParaGuardar,
            tipo: document.getElementById('parte-tipo').value,
            ubicacion: ubicacion.value.trim(),
            descripcion: descripcion.value.trim(),
            victimas_info: document.getElementById('parte-victimas').value.trim(),
            acciones_realizadas: acciones.value.trim(),
            recursos_usados: document.getElementById('parte-recursos').value.trim(),
            organismos_presentes: document.getElementById('parte-organismos').value.trim()
        };

        const { error } = await sb.from('partes_incidencia').insert([nuevoParte]);

        if (error) throw error;

        // 3. ÉXITO (SweetAlert)
        Swal.fire({
            icon: 'success',
            title: '¡Informe Registrado!',
            text: 'El parte se ha guardado correctamente en el archivo.',
            confirmButtonText: 'Volver al Menú',
            confirmButtonColor: '#003366',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = "dashboard.html"; 
        });

    } catch (error) {
        // 4. ERROR (SweetAlert)
        Swal.fire({
            icon: 'error',
            title: 'Error al enviar',
            text: 'No se pudo guardar el parte: ' + error.message,
            confirmButtonColor: '#d33'
        });
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
});