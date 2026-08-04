# Lumo Kids Studio — integración canónica v4

## Resultado de la migración

El Character Design aprobado ya no es un archivo decorativo: gobierna la biblia visual, seis perfiles JSON, hoja de modelo de Lumo, biblioteca visual, continuidad, prompts, prueba del piloto, interfaz de producción y validaciones automáticas.

Fuente maestra: `public/lumo-kids/canon/Character-Design-v4.png`.

## Rutas del estudio

- `/studio/lumo-kids`: panel de temporada y canon v4.
- `/studio/lumo-kids/characters`: biblioteca con imágenes reales de los seis personajes.
- `/studio/lumo-kids/model-sheets/lumo`: Character Design maestro y traspaso v4.
- `/studio/lumo-kids/episodes/S01E01/package`: estrategia de distribución.
- `/studio/lumo-kids/episodes/S01E01/storyboard`: guion técnico.
- `/studio/lumo-kids/episodes/S01E01/proof`: prueba de 25 segundos actualizada al canon v4.
- `/studio/lumo-kids/episodes/S01E01/production`: control de canon, presupuesto y cola protegida.

## Estado audiovisual

El teaser editorial anterior está archivado en `content/production/S01E01-canonical-teaser-v4.json` con `publishable=false` porque no cumplía los objetivos narrativos y visuales del proyecto. No es una referencia canónica ni un entregable para YouTube.

La producción vigente es un microepisodio de 60 segundos en `content/production/S01E01-microepisode-plan-v1.json`. Su prueba inicial de 25 segundos está en `content/production/jobs/S01E01-proof-v1.json` y no se ejecuta hasta completar el preflight vivo de MuAPI.

La publicación se prepara como carga privada y requiere la revisión expresa de Yariel del máster final.

## Dirección artística

Animación 3D estilizada cinematográfica para preescolar, materiales táctiles, iluminación cálida con relleno frío, profundidad real, cámara suave y lectura clara a tamaño de miniatura. Los seis personajes mantienen especie, silueta, proporción, color y accesorios del diseño maestro.

La especificación completa está en `docs/LUMO_VISUAL_BIBLE.md`; la migración desde los perfiles antiguos está en `docs/LUMO_CANON_MIGRATION_V4.md`.

## Presupuesto y siguiente fase

Yariel confirmó `20,67 USD`, con un máximo de `2,25 USD` por intento. La prueba de 25 segundos tiene un tope de `7,52 USD`; el microepisodio completo, `16,44 USD`; la reserva protegida es `4,23 USD`. El sistema vuelve a consultar el saldo vivo y cotiza el payload exacto antes de cualquier compra.

Cada generación pagada exige recortes canónicos v4, contrato de sección, una variación por defecto, una sola solicitud activa, persistencia del `request_id` y revisión antes de extender. Esta política está en `content/production/budget-v1.json` y `docs/LUMO_PRODUCTION_OPERATING_SYSTEM.md`.

## Validación

`npm run kids:validate` comprueba:

- checksum y existencia del Character Design maestro;
- presencia de los seis recortes canónicos;
- perfiles v4 y ausencia de rasgos antiguos activos;
- hoja de modelo v4 aprobada y hoja v1 marcada como retirada;
- continuidad de reparto, escenarios, objetos y secciones;
- seguridad infantil y revisión humana antes de publicación.
- hashes individuales de personajes y Brillavalle;
- topes MuAPI, estados terminales y puerta de YouTube.

## Principio editorial

Las referencias externas sirven para estudiar legibilidad, emoción, ritmo, humor y cooperación. No se copian personajes, nombres, canciones, diálogos, planos ni argumentos de franquicias existentes.
