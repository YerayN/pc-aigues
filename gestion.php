<?php
// 1. SEGURIDAD: Definimos la contraseña
$password_correcta = "Yeray2026"; // <--- ¡CAMBIA ESTO!

$mensaje_estado = "";

// 2. PROCESAR EL FORMULARIO (Si le has dado a Guardar)
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $pass_introducida = $_POST["password"] ?? "";

    if ($pass_introducida === $password_correcta) {
        // Recogemos los datos del formulario
        $nuevo_estado = [
            "mensaje" => $_POST["mensaje"],
            "color"   => $_POST["color"],
            "activa"  => isset($_POST["activa"]) // Si el checkbox está marcado es true
        ];

        // Convertimos a formato JSON bonito
        $json_data = json_encode($nuevo_estado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        // Guardamos en el archivo
        if (file_put_contents("alerta.json", $json_data)) {
            $mensaje_estado = "✅ ¡Alerta actualizada con éxito!";
        } else {
            $mensaje_estado = "❌ Error al escribir el archivo. Revisa permisos.";
        }
    } else {
        $mensaje_estado = "⛔ Contraseña incorrecta.";
    }
}

// 3. LEER EL ESTADO ACTUAL (Para que aparezca relleno en el formulario)
$actual = json_decode(file_get_contents("alerta.json"), true);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Control PC Aigües</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">

    <div class="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-orange-500">
                <span class="text-2xl">⚙️</span>
            </div>
            <h1 class="text-xl font-bold text-orange-500">Centro de Mando</h1>
            <p class="text-gray-400 text-sm">Protección Civil Aigües</p>
        </div>

        <?php if ($mensaje_estado): ?>
            <div class="mb-4 p-3 rounded text-center font-bold <?php echo strpos($mensaje_estado, 'Error') || strpos($mensaje_estado, 'incorrecta') ? 'bg-red-600' : 'bg-green-600'; ?>">
                <?php echo $mensaje_estado; ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-4">
            
            <div>
                <label class="block text-sm font-bold mb-1 text-gray-300">Nivel de Alerta</label>
                <select name="color" class="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-orange-500 outline-none text-white">
                    <option value="verde" <?php echo $actual['color'] == 'verde' ? 'selected' : ''; ?>>🟢 Verde (Normal)</option>
                    <option value="amarillo" <?php echo $actual['color'] == 'amarillo' ? 'selected' : ''; ?>>⚠️ Amarillo (Precaución)</option>
                    <option value="naranja" <?php echo $actual['color'] == 'naranja' ? 'selected' : ''; ?>>🔶 Naranja (Importante)</option>
                    <option value="rojo" <?php echo $actual['color'] == 'rojo' ? 'selected' : ''; ?>>🚨 Rojo (Emergencia)</option>
                    <option value="azul" <?php echo $actual['color'] == 'azul' ? 'selected' : ''; ?>>ℹ️ Azul (Información)</option>
                    <option value="gris" <?php echo $actual['color'] == 'gris' ? 'selected' : ''; ?>>🔘 Gris (Técnico)</option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-bold mb-1 text-gray-300">Mensaje para la población</label>
                <textarea name="mensaje" rows="3" class="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-orange-500 outline-none text-white" placeholder="Escribe aquí el aviso..."><?php echo htmlspecialchars($actual['mensaje']); ?></textarea>
            </div>

            <div class="flex items-center space-x-3 bg-gray-700 p-3 rounded border border-gray-600">
                <input type="checkbox" name="activa" id="activa" class="w-5 h-5 accent-orange-500" <?php echo $actual['activa'] ? 'checked' : ''; ?>>
                <label for="activa" class="text-white font-bold select-none cursor-pointer">Mostrar barra de alerta</label>
            </div>

            <div class="pt-4 border-t border-gray-700">
                <label class="block text-sm font-bold mb-1 text-red-400">Contraseña de Seguridad</label>
                <input type="password" name="password" class="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-red-500 outline-none text-white" placeholder="Introduce la clave">
            </div>

            <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-lg shadow-lg transition transform active:scale-95 mt-4">
                ACTUALIZAR WEB
            </button>
        </form>

        <div class="mt-6 text-center">
            <a href="index.html" class="text-blue-400 text-sm hover:underline">← Volver a la web</a>
        </div>
    </div>

</body>
</html>