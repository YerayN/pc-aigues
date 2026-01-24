// ==========================================
// 1. SISTEMA DE ALERTAS PRO (Iconos Automáticos)
// ==========================================

async function cargarAlerta() {
    const barra = document.getElementById('alert-bar');
    const texto = document.getElementById('alert-text');

    // 1. DICCIONARIO DE COLORES (Estilos CSS)
    const estilos = {
        verde:    "bg-green-600 text-white",
        amarillo: "bg-yellow-400 text-black", // Letra negra para contraste
        naranja:  "bg-orange-500 text-white",
        rojo:     "bg-red-600 text-white animate-pulse",
        azul:     "bg-blue-600 text-white",
        gris:     "bg-gray-500 text-white"
    };

    // 2. DICCIONARIO DE ICONOS (Tus Emojis guardados)
    // Aquí defines qué dibujo sale con cada color
    const iconos = {
        verde:    "☑️",  // Check verde
        amarillo: "⚠️",  // Triángulo precaución
        naranja:  "⚠️",  // Rombo naranja
        rojo:     "⚠️",  // Sirena
        azul:     "📣",  // Info
        gris:     "📣"   // Botón gris
    };

    try {
        const cacheBuster = new Date().getTime(); 
        const respuesta = await fetch(`alerta.json?v=${cacheBuster}`);
        
        if (!respuesta.ok) throw new Error("Fallo de red");

        const datos = await respuesta.json();

        // --- LA MAGIA ESTÁ AQUÍ ---
        // 1. Buscamos el estilo de fondo
        const estiloAsignado = estilos[datos.color] || estilos.gris;
        
        // 2. Buscamos el icono correspondiente
        // Si no encuentra el color, pone un megáfono 📢 por defecto
        const iconoAsignado = iconos[datos.color] || "📢";

        // 3. Montamos la frase final: ICONO + ESPACIO + MENSAJE
        texto.innerHTML = `${iconoAsignado} &nbsp; ${datos.mensaje}`;
        
        // 4. Aplicamos las clases al fondo
        barra.className = `w-full py-3 px-4 text-center font-bold transition-colors duration-300 ${estiloAsignado}`;

        // Mostrar/Ocultar
        barra.style.display = (datos.activa === false) ? 'none' : 'block';

    } catch (error) {
        console.error("Error:", error);
        // Fallback por si se rompe todo
        texto.innerHTML = "🛡️ Protección Civil Aigües - Servicio Activo";
        barra.className = `w-full py-3 px-4 text-center font-bold text-white bg-pc-blue`;
    }
}

// Ejecutar e iniciar el bucle de comprobación
cargarAlerta();
setInterval(cargarAlerta, 60000);


// ==========================================
// 2. WIDGET DE TIEMPO AUTOMÁTICO (API OPEN-METEO)
// ==========================================

async function cargarTiempoReal() {
    // Coordenadas de Aigües, Alicante
    const lat = 38.495;
    const lon = -0.362;

    // Esta es la dirección web (Endpoint) donde preguntamos el tiempo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    try {
        // 1. FETCH: Enviamos al "mensajero" a por los datos
        const respuesta = await fetch(url);
        
        // 2. Convertimos la respuesta en un objeto JSON que JS entienda
        const datos = await respuesta.json();
        
        // 3. Extraemos lo que nos interesa
        const temperatura = datos.current_weather.temperature;
        const codigoClima = datos.current_weather.weathercode;

        // 4. Actualizamos el HTML (DOM)
        document.getElementById('weather-temp').innerText = temperatura + "°C";
        
        // 5. Truco: La API nos da un número (código), no un dibujo.
        // Llamamos a una función auxiliar para "traducir" número a Emoji.
        const infoVisual = traducirCodigoClima(codigoClima);
        
        document.getElementById('weather-icon').innerText = infoVisual.icono;
        // Si tuvieras un elemento para la descripción, usarías infoVisual.desc
        
    } catch (error) {
        console.error("Error al cargar el tiempo:", error);
        document.getElementById('weather-temp').innerText = "--";
        document.getElementById('weather-icon').innerText = "❓";
    }
}

// Función auxiliar: Traduce el idioma de los meteorólogos a Emojis
function traducirCodigoClima(codigo) {
    // La API usa códigos WMO. Aquí tienes una traducción simplificada:
    // 0: Cielo despejado
    if (codigo === 0) return { icono: "☀️", desc: "Despejado" };
    
    // 1, 2, 3: Nublado
    if (codigo >= 1 && codigo <= 3) return { icono: "⛅", desc: "Nuboso" };
    
    // 45, 48: Niebla (Ojo en Aigües con la niebla en la carretera)
    if (codigo === 45 || codigo === 48) return { icono: "🌫️", desc: "Niebla" };
    
    // 51-67: Lluvias
    if (codigo >= 51 && codigo <= 67) return { icono: "🌧️", desc: "Lluvia" };
    
    // 80-82: Chubascos fuertes
    if (codigo >= 80 && codigo <= 82) return { icono: "⛈️", desc: "Tormenta" };
    
    // 95-99: Tormenta eléctrica
    if (codigo >= 95) return { icono: "⚡", desc: "Tormenta Eléctrica" };

    // Por defecto (si sale algo raro como nieve)
    return { icono: "🌡️", desc: "Desconocido" };
}

// Ejecutamos la función
cargarTiempoReal();


// ==========================================
// 3. MAPA INTELIGENTE (PROGRAMADO POR HORAS)
// ==========================================

// 1. Iniciamos el mapa y creamos un GRUPO DE CAPAS
const map = L.map('map').setView([38.495, -0.362], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);

// Creamos una "carpeta" vacía para guardar los marcadores
const capaAvisos = L.layerGroup().addTo(map);


// ==========================================
// DEFINICIÓN DE ICONOS DE COLORES
// ==========================================
// Función auxiliar para crear iconos sin repetir código
function crearIcono(colorName) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],      // Tamaño del pin
        iconAnchor: [12, 41],    // Punto donde "clava" el pin
        popupAnchor: [1, -34],   // Donde sale el bocadillo
        shadowSize: [41, 41]     // Tamaño de la sombra
    });
}

// Nuestro diccionario de iconos listos para usar
const iconos = {
    azul: crearIcono('blue'),
    rojo: crearIcono('red'),
    verde: crearIcono('green'),
    naranja: crearIcono('orange'),
    amarillo: crearIcono('gold'),
    negro: crearIcono('black'),
    gris: crearIcono('grey'),
    violeta: crearIcono('violet')
};

// ------------------------------------------
// 2. TUS DATOS CON FECHAS (FORMATO ISO)
// ------------------------------------------
// Formato de fecha: "AAAA-MM-DDTHH:MM" (La T separa día de hora)
// Si dejas inicio/fin vacíos (""), saldrá siempre.

const agendaAvisos = [
    {
        tipo: "punto", // Puede ser 'punto' o 'linea'
        lat: 38.495, lng: -0.362,
        titulo: "📍 Base Permanente",
        descripcion: "Siempre activo",
        color: "azul",
        inicio: "", // Sin fecha = Siempre visible
        fin: ""
    },
    {
        tipo: "punto",
        lat: 38.498, lng: -0.365,
        titulo: "🔥 Conato de Incendio",
        descripcion: "Precaución, unidades actuando",
        color: "rojo", // <--- PIN ROJO DE PELIGRO
        inicio: "", 
        fin: ""
    },
    {
        tipo: "linea",
        coordenadas: [[38.50044, -0.36514], [38.50125, -0.36425], [38.50183, -0.36431], [38.50235, -0.36420]],
        titulo: "⛔ Corte Procesión (Esta noche)",
        descripcion: "Corte programado de madrugada",
        color: "red",
        // EJEMPLO: Se activa el 25 de Enero de 04:00 a 08:00
        inicio: "2026-01-24T16:02", 
        fin:    "2026-01-25T08:00"
    },
    {
        tipo: "punto",
        lat: 38.492, lng: -0.360,
        titulo: "🚧 Obras Mañana",
        descripcion: "Empiezan mañana a las 9",
        // EJEMPLO: Se activa mañana a las 9:00
        inicio: "2026-01-25T09:00",
        fin:    "2026-01-25T18:00"
    },
    {
        tipo: "zona", // Nuevo tipo
        coordenadas: [
            [38.496, -0.364], 
            [38.496, -0.360], 
            [38.494, -0.364]  
        ],
        titulo: "🅿️ Parking Fiestas",
        descripcion: "Zona habilitada para aparcar.",
        color: "blue",      // Color del borde
        relleno: "#3b82f6", // Color de dentro (Hexadecimal o nombre en inglés)
        inicio: "",         // Siempre visible
        fin: ""
    },
    {
        tipo: "zona",
        coordenadas: [
            [38.50036, -0.36333],
            [38.50016, -0.36335],
            [38.50014, -0.36347],
            [38.50033, -0.36358]
        ], 
        titulo: "⛔ Zona Pirotecnia",
        descripcion: "Peligro: Fuegos artificiales",
        color: "red",
        relleno: "red",
        inicio: "", // Solo visible la noche del 15 de agosto
        fin:    ""
    }
];

// ==========================================
// 3. LA LÓGICA DE TIEMPO (REPARADA)
// ==========================================

function actualizarMapaEnTiempoReal() {
    // 1. Limpiamos el mapa
    capaAvisos.clearLayers();

    // 2. Hora actual
    const ahora = new Date(); 

    // 3. Recorremos la lista
    agendaAvisos.forEach(aviso => {
        let mostrar = false;

        // --- COMPROBACIÓN DE HORAS ---
        if (aviso.inicio === "" && aviso.fin === "") {
            mostrar = true;
        } else {
            const fechaInicio = new Date(aviso.inicio);
            const fechaFin = new Date(aviso.fin);
            if (ahora >= fechaInicio && ahora <= fechaFin) {
                mostrar = true;
            }
        }

        // --- PINTADO (AQUÍ ESTABA EL ERROR) ---
        // Faltaba esta línea: "Si mostrar es true, entonces..."
        if (mostrar) { 
            
            // TIPO: PUNTO
            if (aviso.tipo === "punto") {
                const iconoElegido = iconos[aviso.color] || iconos.azul;
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
        } // Fin del if(mostrar)
    });
    
    console.log("Mapa actualizado correctamente a las: " + ahora.toLocaleTimeString());
}

// ------------------------------------------
// 4. AUTOMATIZACIÓN
// ------------------------------------------
actualizarMapaEnTiempoReal();
setInterval(actualizarMapaEnTiempoReal, 60000);