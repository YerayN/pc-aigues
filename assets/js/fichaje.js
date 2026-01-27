const miNombre = localStorage.getItem('pc_usuario') || "Desconocido";
let intervaloCrono;
let idSesionActiva = null; // Guardará el ID de la fila si estamos trabajando

document.addEventListener('DOMContentLoaded', () => {
    comprobarEstadoActual();
    cargarHistorial();
});

// 1. COMPROBAR SI ESTOY DENTRO O FUERA
async function comprobarEstadoActual() {
    // Buscamos si hay algún registro mío donde 'salida' sea NULL
    const { data, error } = await sb
        .from('registro_horas')
        .select('*')
        .eq('usuario', miNombre)
        .is('salida', null) // Es null = No he salido
        .single();

    if (data) {
        // ESTOY DENTRO TRABAJANDO
        idSesionActiva = data.id;
        configurarInterfaz(true, data.entrada, data.actividad);
    } else {
        // ESTOY FUERA DESCANSANDO
        idSesionActiva = null;
        configurarInterfaz(false);
    }
}

// 2. CONFIGURAR PANTALLA (VERDE O ROJO)
function configurarInterfaz(estoyDentro, fechaEntrada = null, actividad = "") {
    const btn = document.getElementById('btn-accion');
    const badge = document.getElementById('estado-badge');
    const select = document.getElementById('select-actividad');
    const txtInicio = document.getElementById('hora-inicio-txt');

    if (estoyDentro) {
        // MODO SALIDA (ROJO)
        btn.className = "w-48 h-48 rounded-full shadow-lg flex flex-col items-center justify-center transition transform active:scale-95 bg-red-500 hover:bg-red-600 text-white border-4 border-white ring-4 ring-red-100 animate-pulse-slow";
        btn.innerHTML = `<span class="text-4xl mb-1">🏁</span><span class="font-bold text-lg uppercase">TERMINAR<br>TURNO</span>`;
        btn.onclick = ficharSalida;
        
        badge.className = "mb-4 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-green-100 text-green-700 border border-green-200";
        badge.innerText = "🟢 EN SERVICIO: " + actividad.toUpperCase();
        
        select.classList.add('hidden'); // Ocultar selector
        
        // Arrancar cronómetro calculado desde el pasado
        const inicio = new Date(fechaEntrada);
        txtInicio.innerText = "Entrada: " + inicio.toLocaleTimeString();
        iniciarCronometro(inicio);

    } else {
        // MODO ENTRADA (VERDE)
        btn.className = "w-48 h-48 rounded-full shadow-lg flex flex-col items-center justify-center transition transform active:scale-95 bg-green-500 hover:bg-green-600 text-white border-4 border-white ring-4 ring-green-100";
        btn.innerHTML = `<span class="text-5xl mb-2">👆</span><span class="font-bold text-xl uppercase">FICHAR<br>ENTRADA</span>`;
        btn.onclick = ficharEntrada;

        badge.className = "mb-4 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-200 text-gray-500";
        badge.innerText = "💤 FUERA DE SERVICIO";

        select.classList.remove('hidden'); // Mostrar selector
        txtInicio.innerText = "";
        detenerCronometro();
    }
}

// 3. ACCIÓN: ENTRAR
async function ficharEntrada() {
    const actividad = document.getElementById('select-actividad').value;
    const btn = document.getElementById('btn-accion');
    btn.disabled = true; // Evitar doble click

    const { data, error } = await sb
        .from('registro_horas')
        .insert([{ usuario: miNombre, actividad: actividad }])
        .select()
        .single();

    if (!error) {
        idSesionActiva = data.id;
        configurarInterfaz(true, data.entrada, actividad);
        cargarHistorial(); // Refrescar lista
    } else {
        alert("Error al fichar.");
    }
    btn.disabled = false;
}

// 4. ACCIÓN: SALIR
async function ficharSalida() {
    if(!idSesionActiva) return;
    if(!confirm("¿Terminar turno y guardar horas?")) return;

    const btn = document.getElementById('btn-accion');
    btn.disabled = true;

    const fechaSalida = new Date();

    const { error } = await sb
        .from('registro_horas')
        .update({ salida: fechaSalida })
        .eq('id', idSesionActiva);

    if (!error) {
        configurarInterfaz(false);
        cargarHistorial();
        alert("✅ Turno registrado. ¡Buen descanso!");
    } else {
        alert("Error al salir.");
    }
    btn.disabled = false;
}

// 5. CRONÓMETRO VISUAL
function iniciarCronometro(fechaInicio) {
    detenerCronometro(); // Limpiar anterior si hubiera
    const display = document.getElementById('cronometro');
    
    intervaloCrono = setInterval(() => {
        const ahora = new Date();
        const diff = ahora - fechaInicio; // Milisegundos
        
        // Convertir a HH:MM:SS
        const horas = Math.floor(diff / 3600000);
        const minutos = Math.floor((diff % 3600000) / 60000);
        const segundos = Math.floor((diff % 60000) / 1000);

        display.innerText = 
            (horas < 10 ? "0" + horas : horas) + ":" +
            (minutos < 10 ? "0" + minutos : minutos) + ":" +
            (segundos < 10 ? "0" + segundos : segundos);
    }, 1000);
}

function detenerCronometro() {
    clearInterval(intervaloCrono);
    document.getElementById('cronometro').innerText = "00:00:00";
}

// 6. HISTORIAL
async function cargarHistorial() {
    const lista = document.getElementById('lista-fichajes');
    const { data: historial } = await sb
        .from('registro_horas')
        .select('*')
        .eq('usuario', miNombre)
        .not('salida', 'is', null) // Solo los terminados
        .order('entrada', { ascending: false })
        .limit(5); // Solo los últimos 5

    lista.innerHTML = '';
    
    if(!historial || historial.length === 0) {
        lista.innerHTML = '<p class="text-gray-400 text-center text-sm italic">Sin registros recientes.</p>';
        return;
    }

    historial.forEach(reg => {
        const entrada = new Date(reg.entrada);
        const salida = new Date(reg.salida);
        
        // Calcular duración total
        const diffMs = salida - entrada;
        const horas = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);

        lista.innerHTML += `
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                    <p class="font-bold text-gray-700 text-sm">${reg.actividad}</p>
                    <p class="text-xs text-gray-400">
                        ${entrada.toLocaleDateString()} | ${entrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${salida.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                </div>
                <div class="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                    ${horas}h ${mins}m
                </div>
            </div>
        `;
    });
}