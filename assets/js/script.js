// ==========================================
// 1. SISTEMA DE ALERTAS PÚBLICAS (Desde Supabase)
// ==========================================

async function cargarAlerta() {
    const barra = document.getElementById('alert-bar');
    const texto = document.getElementById('alert-text');

    const estilos = {
        verde:    "bg-green-600 text-white",
        amarillo: "bg-yellow-400 text-black",
        naranja:  "bg-orange-500 text-white",
        rojo:     "bg-red-600 text-white animate-pulse",
        azul:     "bg-blue-600 text-white",
        gris:     "bg-gray-500 text-white"
    };

    const iconosAlerta = {
        verde: "☑️", amarillo: "⚠️", naranja: "⚠️", rojo: "🚨", azul: "📣", gris: "📣"
    };

    try {
        // CAMBIO: Leemos de Supabase en vez de alerta.json
        const { data, error } = await sb
            .from('alerta_publica')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;

        // Si no está activa o no hay datos, ocultamos
        if (!data || data.activa === false) {
            barra.style.display = 'none';
            return;
        }

        const estiloAsignado = estilos[data.color] || estilos.gris;
        const iconoAsignado = iconosAlerta[data.color] || "📢";

        texto.innerHTML = `${iconoAsignado} &nbsp; ${data.mensaje}`;
        barra.className = `w-full py-3 px-4 text-center font-bold transition-colors duration-300 ${estiloAsignado}`;
        barra.style.display = 'block';

    } catch (error) {
        console.error("Error alerta:", error);
        // Fallback seguro
        barra.style.display = 'none';
    }
}

// ==========================================
// 2. WIDGET DE TIEMPO (Este se queda igual, API externa)
// ==========================================

async function cargarTiempoReal() {
    const lat = 38.495;
    const lon = -0.362;
    // ... Tu lógica de tiempo se mantiene igual ...
    // (Resumido para no ocupar espacio, el código de tiempo no cambia)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        document.getElementById('weather-temp').innerText = datos.current_weather.temperature + "°C";
        document.getElementById('weather-icon').innerText = traducirCodigoClima(datos.current_weather.weathercode).icono;
    } catch (e) { console.error(e); }
}

function traducirCodigoClima(codigo) {
    if (codigo === 0) return { icono: "☀️" };
    if (codigo >= 1 && codigo <= 3) return { icono: "⛅" };
    if (codigo >= 51) return { icono: "🌧️" };
    if (codigo >= 95) return { icono: "⚡" };
    return { icono: "🌡️" };
}


// ==========================================
// 3. MAPA INTELIGENTE (Desde Supabase)
// ==========================================

// Inicializar Mapa
const map = L.map('map').setView([38.500, -0.363], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);
const capaAvisos = L.layerGroup().addTo(map);

// Iconos
function crearIcono(colorName) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
}
const iconosMapa = {
    azul: crearIcono('blue'), rojo: crearIcono('red'), verde: crearIcono('green'),
    naranja: crearIcono('orange'), amarillo: crearIcono('gold'), gris: crearIcono('grey')
};

async function actualizarMapaEnTiempoReal() {
    try {
        // CAMBIO: Leemos de la tabla 'mapa_elementos'
        const { data: agendaAvisos, error } = await sb
            .from('mapa_elementos')
            .select('*');

        if (error) throw error;

        capaAvisos.clearLayers();
        const ahora = new Date(); 

        agendaAvisos.forEach(aviso => {
            let mostrar = true;

            // Filtro de fechas (Si tiene fecha inicio/fin)
            if (aviso.inicio && aviso.fin) {
                const fechaInicio = new Date(aviso.inicio);
                const fechaFin = new Date(aviso.fin);
                if (ahora < fechaInicio || ahora > fechaFin) mostrar = false;
            }

            if (mostrar) {
                // TIPO: PUNTO
                if (aviso.tipo === "punto" && aviso.lat && aviso.lng) {
                    const iconoElegido = iconosMapa[aviso.color] || iconosMapa.azul;
                    L.marker([aviso.lat, aviso.lng], { icon: iconoElegido })
                     .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion || ''}`)
                     .addTo(capaAvisos);
                
                // TIPO: LÍNEA o ZONA (Usan columna 'coordenadas')
                } else if (aviso.tipo === "linea" && aviso.coordenadas) {
                    L.polyline(aviso.coordenadas, { color: aviso.color || 'blue', weight: 5 })
                     .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion || ''}`)
                     .addTo(capaAvisos);

                } else if (aviso.tipo === "zona" && aviso.coordenadas) {
                    L.polygon(aviso.coordenadas, { 
                        color: aviso.color || 'orange',
                        fillColor: aviso.relleno || 'yellow', fillOpacity: 0.4
                    })
                    .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion || ''}`)
                    .addTo(capaAvisos);
                }
            } 
        });

    } catch (error) {
        console.error("Error mapa:", error);
    }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    cargarAlerta();
    cargarTiempoReal();
    actualizarMapaEnTiempoReal();
    
    // Auto-actualizar cada 60s
    setInterval(cargarAlerta, 60000);
    setInterval(actualizarMapaEnTiempoReal, 60000);
});