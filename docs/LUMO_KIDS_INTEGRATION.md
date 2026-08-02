# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Open Generative AI conserva sus estudios multimedia; Lumo Kids añade organización narrativa, consistencia visual, seguridad infantil, estrategia multiplataforma, guion técnico, keyframes y revisión humana.

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
- `/studio/lumo-kids/episodes/S01E01/storyboard`: guion técnico, línea temporal y producción escena por escena.
- `/studio/lumo-kids/episodes/S01E01/keyframes`: revisión del primer pase visual de SC01, SC02, SC14 y SC16.

## Contenido versionado

- `content/season-01/season.json`: plan general de temporada.
- `content/season-01/episodes/`: manifiestos narrativos de episodios.
- `content/season-01/packages/`: títulos públicos, miniaturas, canciones, Shorts, compilaciones y objetivos de medición.
- `content/season-01/storyboards/`: escenas, diálogos, cámara, sonido, continuidad y recursos de producción.
- `content/season-01/keyframes/`: manifiestos de fotogramas de referencia, criterios y aprobación.
- `content/characters/index.json`: índice de personajes.
- `content/characters/profiles/`: fichas maestras para generación consistente.
- `content/characters/model-sheets/`: manifiestos de hojas de modelo, prompts y parámetros de generación.
- `public/lumo-kids/model-sheets/`: hojas visuales públicas y versionadas.
- `public/lumo-kids/keyframes/`: keyframes SVG editables y hoja comparativa.
- `docs/LUMO_VISUAL_BIBLE.md`: lenguaje visual, proporciones y restricciones.
- `docs/YOUTUBE_GROWTH_STRATEGY.md`: estrategia editorial y de distribución.

## Paquete multiplataforma

Cada historia mantiene su manifiesto narrativo y añade un paquete de lanzamiento independiente. Este paquete contiene título, apertura, miniatura, canción, línea temporal, tres Shorts, compilaciones y objetivos de medición. La separación permite mejorar distribución sin modificar la enseñanza.

## Guion técnico y storyboard

El storyboard desarrolla el paquete de lanzamiento sin cambiar su duración total. Cada escena declara intervalo, objetivo, personajes, emoción, plano, cámara, acción, diálogo, audio, iluminación, recursos, continuidad y prompt visual. El piloto contiene 18 escenas consecutivas entre `0:00` y `5:10`.

## Primer pase de keyframes

Antes de producir las dieciocho escenas se revisan cuatro momentos de alto impacto:

1. `SC01`: claridad del gancho y lectura del apagón.
2. `SC02`: presentación de Lumo, rincón y piedra luminosa.
3. `SC14`: confesión segura y respuesta de apoyo.
4. `SC16`: recompensa visual y colaboración del grupo.

Los activos iniciales son SVG a `1600 × 900`, editables y pendientes de aprobación humana. Sirven para decidir composición, emoción, contraste, continuidad y paleta; no son fotogramas finales de emisión.

## Traspaso entre estudios

Las pantallas guardan paquetes temporales en `sessionStorage`:

- `lumo_image_studio_handoff_v1`: hoja canónica y prompts del personaje.
- `lumo_episode_launch_handoff_v1`: episodio, pieza seleccionada y datos de distribución.
- `lumo_storyboard_handoff_v1`: escena, cámara, diálogo, audio, recursos y prompt visual.
- `lumo_keyframe_handoff_v1`: keyframe seleccionado, escena de origen y criterios de revisión.

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

`npm run kids:validate` comprueba episodios, paquetes, storyboards, personajes, hojas de modelo y keyframes. Para el primer pase visual verifica:

- Formato SVG y relación `16:9`.
- Resolución `1600 × 900`.
- Existencia de los cuatro activos y de la hoja comparativa.
- Correspondencia con escenas reales del storyboard.
- Presencia obligatoria de SC01, SC02, SC14 y SC16.
- Un mínimo de tres criterios por fotograma.
- Revisión humana antes de usar `status=approved`.
- Seguridad infantil en todo el texto del manifiesto.

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Seleccionar o crear un capítulo.
2. Aprobar enseñanza, logline y estructura narrativa.
3. Crear el paquete multiplataforma.
4. Aprobar título, apertura y miniatura.
5. Escribir el guion técnico.
6. Revisar diálogos, planos y continuidad.
7. Seleccionar hojas de modelo.
8. Revisar keyframes prioritarios.
9. Refinar y aprobar un keyframe por escena.
10. Producir canción, voces, ambiente y efectos.
11. Animar escenas y montar el capítulo.
12. Derivar canción independiente y Shorts.
13. Ejecutar validación de seguridad.
14. Registrar aprobación humana.
15. Exportar y publicar manualmente.

## Principio editorial

Las referencias de animación sirven para estudiar ritmo coral, problemas cotidianos, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, títulos ni argumentos.
