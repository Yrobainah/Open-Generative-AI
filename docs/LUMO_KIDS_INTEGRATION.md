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

## Contenido versionado

- `content/season-01/season.json`: plan general de temporada.
- `content/season-01/episodes/`: manifiestos de episodios.
- `content/characters/index.json`: índice de personajes.
- `content/characters/profiles/`: fichas maestras para generación consistente.
- `docs/LUMO_VISUAL_BIBLE.md`: lenguaje visual, proporciones y restricciones.

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

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Seleccionar o crear un capítulo.
2. Aprobar enseñanza, logline y estructura narrativa.
3. Seleccionar personajes desde la biblioteca.
4. Construir prompts usando las fichas maestras.
5. Generar hojas de modelo y aprobarlas humanamente.
6. Crear storyboard, voces, animación y montaje.
7. Ejecutar validación de seguridad.
8. Registrar aprobación humana.
9. Exportar y publicar manualmente.

## Principio editorial

Las referencias de animación sirven para estudiar ritmo coral, problemas cotidianos, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, títulos ni argumentos.
