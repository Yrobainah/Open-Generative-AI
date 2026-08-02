# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Open Generative AI conserva sus estudios multimedia; Lumo Kids añade organización narrativa, consistencia visual, seguridad infantil y revisión humana.

## Herramientas externas

Las versiones se fijan en `config/integrations.lock.json`:

- Caveman: apoyo al desarrollo con agentes y reducción de salida innecesaria.
- Graphify: mapa local del código y de la documentación del proyecto.

Se descargan en `tools/`, directorio ignorado por Git. No forman parte del producto final ni de la interfaz infantil.

## Rutas

- `/studio/lumo-kids`: panel de temporada y episodios.
- `/studio/lumo-kids/characters`: biblioteca y biblia visual de personajes.
- `/studio/lumo-kids/model-sheets/lumo`: revisión de la hoja canónica de Lumo y traspaso hacia Image Studio.

## Contenido versionado

- `content/season-01/season.json`: plan general de temporada.
- `content/season-01/episodes/`: manifiestos de episodios.
- `content/characters/index.json`: índice de personajes.
- `content/characters/profiles/`: fichas maestras para generación consistente.
- `content/characters/model-sheets/`: manifiestos de hojas de modelo, prompts y parámetros de generación.
- `public/lumo-kids/model-sheets/`: activos visuales públicos y versionados.
- `docs/LUMO_VISUAL_BIBLE.md`: lenguaje visual, proporciones y restricciones.

## Traspaso a Image Studio

La pantalla de hoja de modelo permite:

1. Revisar el activo canónico completo.
2. Copiar el prompt positivo, negativo y los parámetros recomendados.
3. Guardar en `sessionStorage` un paquete `lumo_image_studio_handoff_v1`.
4. Abrir `/studio/image` con el origen `lumo-model-sheet`.

El paquete contiene personaje, activo de referencia, relación de aspecto, resolución y fuerza de referencia. No incluye claves ni información personal.

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
3. Seleccionar personajes desde la biblioteca.
4. Revisar la hoja de modelo canónica.
5. Preparar el paquete de referencia para Image Studio.
6. Generar variaciones y aprobarlas humanamente.
7. Crear storyboard, voces, animación y montaje.
8. Ejecutar validación de seguridad.
9. Registrar aprobación humana.
10. Exportar y publicar manualmente.

## Principio editorial

Las referencias de animación sirven para estudiar ritmo coral, problemas cotidianos, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, títulos ni argumentos.
