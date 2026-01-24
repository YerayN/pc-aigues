// ==========================================
// 1. SISTEMA DE ALERTAS PRO (Iconos Automáticos)
// ==========================================

async function cargarAlerta() {
    const barra = document.getElementById('alert-bar');
    const texto = document.getElementById('alert-text');

    // DICCIONARIO DE COLORES (Estilos CSS)
    const estilos = {
        verde:    "bg-green-600 text-white",
        amarillo: "bg-yellow-400 text-black",
        naranja:  "bg-orange-500 text-white",
        rojo:     "bg-red-600 text-white animate-pulse",
        azul:     "bg-blue-600 text-white",
        gris:     "bg-gray-500 text-white"
    };

    // DICCIONARIO DE ICONOS DE ALERTA
    const iconosAlerta = {
        verde:    "☑️",
        amarillo: "⚠️",
        naranja:  "⚠️",
        rojo:     "🚨",
        azul:     "📣",
        gris:     "📣"
    };

    try {
        const cacheBuster = new Date().getTime(); 
        const respuesta = await fetch(`alerta.json?v=${cacheBuster}`);
        
        if (!respuesta.ok) throw new Error("Fallo de red");

        const datos = await respuesta.json();

        // 1. Buscamos el estilo y el icono
        const estiloAsignado = estilos[datos.color] || estilos.gris;
        const iconoAsignado = iconosAlerta[datos.color] || "📢";

        // 2. Montamos la frase
        texto.innerHTML = `${iconoAsignado} &nbsp; ${datos.mensaje}`;
        
        // 3. Aplicamos clases
        barra.className = `w-full py-3 px-4 text-center font-bold transition-colors duration-300 ${estiloAsignado}`;

        // Mostrar/Ocultar
        barra.style.display = (datos.activa === false) ? 'none' : 'block';

    } catch (error) {
        console.error("Error alerta:", error);
        texto.innerHTML = "🛡️ Protección Civil Aigües - Servicio Activo";
        barra.className = `w-full py-3 px-4 text-center font-bold text-white bg-pc-blue`;
    }
}

// Iniciar sistema de alertas
cargarAlerta();
setInterval(cargarAlerta, 60000);


// ==========================================
// 2. WIDGET DE TIEMPO AUTOMÁTICO
// ==========================================

async function cargarTiempoReal() {
    const lat = 38.495;
    const lon = -0.362;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        const temperatura = datos.current_weather.temperature;
        const codigoClima = datos.current_weather.weathercode;

        document.getElementById('weather-temp').innerText = temperatura + "°C";
        
        // Función auxiliar para traducir código a emoji
        const infoVisual = traducirCodigoClima(codigoClima);
        document.getElementById('weather-icon').innerText = infoVisual.icono;
        
    } catch (error) {
        console.error("Error tiempo:", error);
        document.getElementById('weather-temp').innerText = "--";
        document.getElementById('weather-icon').innerText = "❓";
    }
}

function traducirCodigoClima(codigo) {
    if (codigo === 0) return { icono: "☀️", desc: "Despejado" };
    if (codigo >= 1 && codigo <= 3) return { icono: "⛅", desc: "Nuboso" };
    if (codigo === 45 || codigo === 48) return { icono: "🌫️", desc: "Niebla" };
    if (codigo >= 51 && codigo <= 67) return { icono: "🌧️", desc: "Lluvia" };
    if (codigo >= 80 && codigo <= 82) return { icono: "⛈️", desc: "Tormenta" };
    if (codigo >= 95) return { icono: "⚡", desc: "Tormenta Eléctrica" };
    return { icono: "🌡️", desc: "Desconocido" };
}

cargarTiempoReal();


// ==========================================
// 3. MAPA INTELIGENTE (CONECTADO A JSON EXTERNO)
// ==========================================

// Inicializar Mapa
const map = L.map('map').setView([38.500, -0.363], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);

// Capa de marcadores
const capaAvisos = L.layerGroup().addTo(map);


// --- CONFIGURACIÓN DE ICONOS DE MAPA (PINES) ---
function crearIcono(colorName) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

const iconosMapa = {
    azul: crearIcono('blue'),
    rojo: crearIcono('red'),
    verde: crearIcono('green'),
    naranja: crearIcono('orange'),
    amarillo: crearIcono('gold'),
    negro: crearIcono('black'),
    gris: crearIcono('grey'),
    violeta: crearIcono('violet')
};


// --- FUNCIÓN PRINCIPAL DEL MAPA (ASYNC) ---
async function actualizarMapaEnTiempoReal() {
    // 1. Truco anti-caché
    const cacheBuster = new Date().getTime();

    try {
        // 2. PEDIMOS LOS DATOS A 'mapa.json'
        const respuesta = await fetch(`mapa.json?v=${cacheBuster}`);
        if (!respuesta.ok) throw new Error("No se pudo cargar el mapa");
        
        // Guardamos los datos del archivo en la variable agendaAvisos
        const agendaAvisos = await respuesta.json();

        // 3. Limpiamos lo viejo
        capaAvisos.clearLayers();

        // 4. Filtramos por hora
        const ahora = new Date(); 

        agendaAvisos.forEach(aviso => {
            let mostrar = false;

            // Lógica de fechas
            if (aviso.inicio === "" && aviso.fin === "") {
                mostrar = true;
            } else {
                const fechaInicio = new Date(aviso.inicio);
                const fechaFin = new Date(aviso.fin);
                if (ahora >= fechaInicio && ahora <= fechaFin) {
                    mostrar = true;
                }
            }

            // Pintamos si corresponde
            if (mostrar) { 
                
                // TIPO: PUNTO
                if (aviso.tipo === "punto") {
                    const iconoElegido = iconosMapa[aviso.color] || iconosMapa.azul;
                    L.marker([aviso.lat, aviso.lng], { icon: iconoElegido })
                     .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion}`)
                     .addTo(capaAvisos);
                
                // TIPO: LÍNEA
                } else if (aviso.tipo === "linea") {
                    L.polyline(aviso.coordenadas, { 
                        color: aviso.color || 'blue', 
                        weight: 5 
                    })
                     .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion}`)
                     .addTo(capaAvisos);

                // TIPO: ZONA
                } else if (aviso.tipo === "zona") {
                    L.polygon(aviso.coordenadas, { 
                        color: aviso.color || 'orange',
                        fillColor: aviso.relleno || 'yellow',
                        fillOpacity: 0.4,
                        weight: 2 
                    })
                    .bindPopup(`<b>${aviso.titulo}</b><br>${aviso.descripcion}`)
                    .addTo(capaAvisos);
                }
            } 
        });
        
        console.log("Mapa sincronizado: " + ahora.toLocaleTimeString());

    } catch (error) {
        console.error("Error actualizando mapa:", error);
    }
}

// Ejecutar al inicio y cada 60 segundos
actualizarMapaEnTiempoReal();
setInterval(actualizarMapaEnTiempoReal, 60000);