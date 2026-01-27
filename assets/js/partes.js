document.addEventListener('DOMContentLoaded', () => {
    prepararFormulario();
});

function prepararFormulario() {
    // 1. Poner Nombre del Voluntario (Automático)
    const usuario = localStorage.getItem('pc_usuario') || "Anónimo";
    document.getElementById('parte-usuario').value = usuario;

    // 2. Poner Fecha y Hora Actual (Automático)
    const ahora = new Date();
    // Truco visual para que el input muestre la hora local por defecto
    const fechaLocal = new Date(ahora.getTime() - (ahora.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('parte-fecha').value = fechaLocal;
}

document.getElementById('form-parte').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Enviando informe...";

    // RECOGER FECHA DEL INPUT
    const fechaInput = document.getElementById('parte-fecha').value;
    
    // CORRECCIÓN DE HORA: Creamos un objeto Date con la hora local del input
    // y lo convertimos a ISO (UTC) para que Supabase lo guarde bien.
    const fechaParaGuardar = new Date(fechaInput).toISOString();

    const nuevoParte = {
        usuario_creador: document.getElementById('parte-usuario').value,
        fecha_hora: fechaParaGuardar, // <--- AQUÍ ESTÁ EL ARREGLO
        tipo: document.getElementById('parte-tipo').value,
        ubicacion: document.getElementById('parte-ubicacion').value,
        descripcion: document.getElementById('parte-descripcion').value,
        victimas_info: document.getElementById('parte-victimas').value,
        acciones_realizadas: document.getElementById('parte-acciones').value,
        recursos_usados: document.getElementById('parte-recursos').value,
        organismos_presentes: document.getElementById('parte-organismos').value
    };

    const { error } = await sb.from('partes_incidencia').insert([nuevoParte]);

    if (error) {
        alert("Error al guardar el parte: " + error.message);
        btn.disabled = false;
        btn.innerText = "📩 FIRMAR Y ENVIAR PARTE";
    } else {
        alert("✅ Parte registrado correctamente.");
        window.location.href = "dashboard.html"; 
    }
});