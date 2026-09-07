# Edición documental con video real

## Objetivo
Hacer que cada documental combine imágenes históricas y clips reales libres, siguiendo lo que se narra y manteniendo una edición fluida y profesional.

## Cambios
- Reforzar la búsqueda en Wikimedia Commons para encontrar videos de dominio público o con licencia Creative Commons, primero por cada escena y luego por el tema general.
- Validar el formato y usar una versión reproducible real del archivo, sin construir enlaces que puedan no existir.
- Mejorar la selección por coincidencia entre el relato, el título, la descripción y las palabras clave del clip; evitar repeticiones y material poco relacionado.
- Alternar imágenes y clips dentro del montaje, reservando video para los momentos con mejor coincidencia y usando imágenes libres como respaldo inmediato.
- Añadir entradas, salidas y movimientos diferenciados para clips e imágenes según el estilo de animación elegido, manteniendo la voz como guía del ritmo.
- Si un video tarda demasiado o falla, continuar sin interrupción con la imagen relacionada de esa escena.
- Conservar en pantalla el crédito breve y la licencia de cada recurso utilizado.
- Actualizar los mensajes del estudio para explicar que el montaje mezcla fotos, obras y videos reales de archivos libres.

## Detalles técnicos
- Ampliar los datos de cada escena con metadatos del recurso y una URL de procedencia verificable.
- Consultar los derivados/transcodificaciones que Commons expone realmente y elegir el formato compatible más liviano disponible.
- Controlar carga, error, pausa, reanudación y salto de escena desde el reproductor, sin cortar la narración.
- No se utilizarán fragmentos protegidos por el solo hecho de durar pocos segundos: todo el material externo tendrá licencia libre o será de dominio público.

## Verificación
- Generar un documental histórico de prueba y confirmar que mezcla clips e imágenes pertinentes sin repetir recursos.
- Probar pausa, adelanto, retroceso y cambio de escena con video activo.
- Simular un clip inválido y comprobar que aparece la imagen de respaldo sin detener el relato.
- Revisar en pantalla móvil y escritorio que créditos, controles y encuadres no se superpongan.
