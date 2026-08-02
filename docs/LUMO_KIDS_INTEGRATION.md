# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Open Generative AI conserva sus estudios multimedia; Lumo Kids añade organización narrativa, consistencia visual, seguridad infantil, estrategia multiplataforma, guion técnico y revisión humana.

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

## Contenido versionado

- `content/season-01/season.json`: plan general de temporada.
- `content/season-01/episodes/`: manifiestos narrativos de episodios.
- `content/season-01/packages/`: títulos públicos, miniaturas, canciones, Shorts, compilaciones y objetivos de medición.
- `content/season-01/storyboards/`: escenas, diálogos, cámara, sonido, continuidad y recursos de producción.
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

## Guion técnico y storyboard

El storyboard desarrolla el paquete de lanzamiento sin cambiar su duración total. Cada escena declara:

- Intervalo temporal continuo.
- Objetivo dramático y de retención.
- Lugar y personajes.
- Emoción principal.
- Tamaño de plano, ángulo y composición.
- Movimiento de cámara y transiciones.
- Acción, diálogo y dirección interpretativa.
- Música, ambiente y efectos.
- Iluminación.
- Recursos reutilizables.
- Regla de continuidad.
- Prompt visual específico del plano.

El piloto contiene 18 escenas consecutivas entre `0:00` y `5:10`. Los intentos de la pandilla, La Ronda de las Ideas y la resolución tienen bloques temporales diferenciados.

## Traspaso entre estudios

Las pantallas de Lumo Kids guardan paquetes temporales en `sessionStorage` para entregar contexto a los estudios multimedia:

- `lumo_image_studio_handoff_v1`: hoja canónica y prompts del personaje.
- `lumo_episode_launch_handoff_v1`: episodio, pieza seleccionada y datos de distribución.
- `lumo_storyboard_handoff_v1`: escena seleccionada, cámara, diálogo, audio, recursos y prompt visual.

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
- Storyboards de entre cuatro y seis minutos.
- Escenas consecutivas, numeradas y sin huecos.
- Personajes con referencia maestra.
- Plano, cámara, diálogo, audio, iluminación, continuidad y prompt por escena.
- Recursos declarados en el registro de producción.
- Existencia de La Ronda de las Ideas y de una resolución final.
- Campos visuales y paletas de personajes.
- Vistas, expresiones y prompts negativos mínimos.
- Ausencia de referencias a franquicias o estilos protegidos en prompts maestros.
- Manifiestos de hojas de modelo y existencia del activo visual asociado.

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Seleccionar o crear un capítulo.
2. Aprobar enseñanza, logline y estructura narrativa.
3. Crear el paquete multiplataforma del capítulo.
4. Aprobar título público, apertura y miniatura.
5. Escribir el guion técnico y fijar la línea temporal.
6. Revisar diálogos, actuación, planos y continuidad.
7. Seleccionar personajes y hojas de modelo canónicas.
8. Generar un keyframe aprobado por escena en Image Studio.
9. Producir canción, voces, ambiente y efectos en Audio Studio.
10. Animar escenas y montar el capítulo en Video Studio.
11. Derivar canción independiente y tres Shorts.
12. Ejecutar validación de seguridad.
13. Registrar aprobación humana.
14. Exportar y publicar manualmente.
15. Registrar resultados y ajustar el siguiente paquete.

## Principio editorial

Las referencias de animación sirven para estudiar ritmo coral, problemas cotidianos, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, títulos ni argumentos.
