# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Open Generative AI conserva sus estudios multimedia; Lumo Kids añade organización narrativa, consistencia visual, seguridad infantil, estrategia multiplataforma y revisión humana.

## Herramientas externas

Las versiones se fijan en `config/integrations.lock.json`:

- Caveman: apoyo al desarrollo con agentes y reducción de salida innecesaria.
- Graphify: mapa local del código y de la documentación del proyecto.

Se descargan en `tools/`, directorio ignorado por Git. No forman parte del producto final ni de la interfaz infantil.

## Rutas

- `/studio/lumo-kids`: panel de temporada y episodios.
- `/studio/lumo-kids/characters`: biblioteca y biblia visual de personajes.
- `/studio/lumo-kids/model-sheets/lumo`: revisión de la hoja canónica de Lumo y traspaso hacia Image Studio.
- `/studio/lumo-kids/episodes/S01E01/package`: estrategia de lanzamiento del piloto, canción, Shorts y medición.

## Contenido versionado

- `content/season-01/season.json`: plan general de temporada.
- `content/season-01/episodes/`: manifiestos narrativos de episodios.
- `content/season-01/packages/`: títulos públicos, miniaturas, canciones, Shorts, compilaciones y objetivos de medición.
- `content/characters/index.json`: índice de personajes.
- `content/characters/profiles/`: fichas maestras para generación consistente.
- `content/characters/model-sheets/`: manifiestos de hojas de modelo, prompts y parámetros de generación.
- `public/lumo-kids/model-sheets/`: activos visuales públicos y versionados.
- `docs/LUMO_VISUAL_BIBLE.md`: lenguaje visual, proporciones y restricciones.
- `docs/YOUTUBE_GROWTH_STRATEGY.md`: estrategia editorial y de distribución.

## Paquete multiplataforma

Cada historia mantiene su manifiesto narrativo y añade un paquete de lanzamiento independiente. Este paquete contiene:

1. Título orientado a descubrimiento.
2. Apertura de tres a quince segundos.
3. Concepto de miniatura.
4. Canción de La Ronda de las Ideas.
5. Línea temporal del episodio principal.
6. Tres Shorts con funciones distintas.
7. Grupos para futuras compilaciones.
8. Momentos de retención.
9. Variantes de publicación marcadas para niños.
10. Objetivos internos de medición.

La separación permite mejorar títulos, miniaturas y distribución sin modificar la historia ni la enseñanza.

## Traspaso entre estudios

Las pantallas de Lumo Kids guardan paquetes temporales en `sessionStorage` para entregar contexto a los estudios multimedia:

- `lumo_image_studio_handoff_v1`: hoja canónica y prompts del personaje.
- `lumo_episode_launch_handoff_v1`: episodio, pieza seleccionada y datos de producción.

Los paquetes no incluyen claves ni información personal.

## Instalación en Windows

Desde CMD, en la raíz del repositorio:

```bat
scripts\setup-kids-studio.cmd
```

## Comandos

```bat
npm run kids:validate
npm run kids:graph
npm run kids:setup:windows
```

## Validación

`npm run kids:validate` comprueba:

- Campos y códigos de episodios.
- Duración y estado de producción.
- Clasificación obligatoria para niños.
- Revisión humana antes de publicar.
- Patrones de contenido bloqueado.
- Títulos, apertura, miniatura, canción y línea temporal de los paquetes de lanzamiento.
- Tres Shorts con formato y duración válidos.
- Variantes de publicación marcadas para niños.
- Objetivos de medición dentro de rangos válidos.
- Campos visuales y paletas de personajes.
- Vistas, expresiones y prompts negativos mínimos.
- Ausencia de referencias a franquicias o estilos protegidos en prompts maestros.
- Manifiestos de hojas de modelo.
- Existencia del activo visual asociado.
- Resolución, fuerza de referencia, vistas y expresiones obligatorias.

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Seleccionar o crear un capítulo.
2. Aprobar enseñanza, logline y estructura narrativa.
3. Crear el paquete multiplataforma del capítulo.
4. Aprobar título público, apertura y miniatura.
5. Seleccionar personajes desde la biblioteca.
6. Revisar las hojas de modelo canónicas.
7. Preparar referencias para Image Studio.
8. Producir canción y voces en Audio Studio.
9. Generar escenas, storyboard, animación y Shorts.
10. Ejecutar validación de seguridad.
11. Registrar aprobación humana.
12. Exportar y publicar manualmente.
13. Registrar resultados y ajustar el siguiente paquete.

## Principio editorial

Las referencias de animación sirven para estudiar ritmo coral, problemas cotidianos, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, títulos ni argumentos.
