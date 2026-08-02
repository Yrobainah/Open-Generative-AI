# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Lumo Kids añade organización narrativa, dirección visual 3D, consistencia de personajes, seguridad infantil, estrategia multiplataforma, guion técnico y revisión humana.

## Rutas

- `/studio/lumo-kids`: panel de temporada y episodios.
- `/studio/lumo-kids/characters`: biblioteca de los seis personajes del piloto.
- `/studio/lumo-kids/model-sheets/lumo`: referencia inicial de Lumo y traspaso hacia Image Studio.
- `/studio/lumo-kids/episodes/S01E01/package`: título, canción, Shorts y estrategia de distribución.
- `/studio/lumo-kids/episodes/S01E01/storyboard`: guion técnico y producción escena por escena.
- `/studio/lumo-kids/episodes/S01E01/keyframes`: registro del primer pase vectorial descartado.

## Nueva dirección artística

La serie adopta animación 3D estilizada premium para preescolar:

- Personajes redondeados, suaves y expresivos.
- Ojos, cejas, párpados, boca y postura capaces de comunicar la emoción sin diálogo.
- Materiales diferenciados y coherentes.
- Iluminación cinematográfica cálida con rellenos fríos.
- Escenarios con profundidad ambiental.
- Movimiento con anticipación, peso y rebote suave.
- Composición preparada para vídeo `16:9`, recortes `9:16` y miniaturas.

La especificación completa está en `docs/LUMO_VISUAL_BIBLE.md`.

## Episodio piloto v2

**Título artístico:** `Lumo y la luz de la fiesta`  
**Duración:** `6:00`  
**Enseñanza:** compartir, incluir y reparar el daño.

Brillavalle se prepara para la Fiesta de las Mil Luces. Nublo, una criatura nocturna que se siente olvidada, toma el Corazón de Luz del pueblo para iluminar una celebración solitaria. Lumo y sus amigos comparten sus propios destellos, siguen el rastro hasta el observatorio y atraviesan tres retos usando las habilidades de Biri, Nara, Tuno y Pompón. En lugar de arrebatar la fuente, realizan La Ronda de las Ideas. Nublo comprende el daño, devuelve la luz y ayuda a llevarla a la plaza. La fiesta comienza con fuegos artificiales mágicos y silenciosos.

## Guion técnico

El storyboard v2 contiene veinte escenas continuas entre `0:00` y `6:00`:

1. Preparativos y presentación del Corazón de Luz.
2. Aparición de Nublo y desaparición de la fuente.
3. Descubrimiento del rastro.
4. Reparto de los destellos de Lumo.
5. Puente, niebla y puerta del observatorio.
6. Revelación de la motivación de Nublo.
7. La Ronda de las Ideas y la canción `Compartimos nuestro brillo`.
8. Disculpa, devolución y regreso en relevo.
9. Encendido de Brillavalle y fuegos de luz.

Cada escena declara tiempo, objetivo, personajes, emoción, plano, cámara, acción, diálogo, audio, iluminación, recursos, continuidad y prompt 3D.

## Reparto

- Lumo: protagonista luminoso.
- Nara: guía serena.
- Tuno: inventor.
- Biri: explorador aéreo.
- Pompón: compañero sensible y cómico.
- Nublo: antagonista travieso que aprende a reparar el daño.

Las fichas maestras se encuentran en `content/characters/profiles/`.

## Paquete de lanzamiento

`content/season-01/packages/S01E01.launch.json` contiene:

- Título orientado a descubrimiento.
- Apertura de diez segundos.
- Concepto de miniatura.
- Canción original de 64 segundos.
- Línea temporal completa.
- Tres Shorts: desaparición, canción y fuegos de luz.
- Nueve momentos de retención.
- Objetivos internos de retención y porcentaje visto.

## Keyframes anteriores

Los SVG del primer enfoque 2D quedan con `status=superseded`. Se conservan solo para trazabilidad y no deben utilizarse como arte final, referencia 3D, miniatura ni material de producción.

El siguiente conjunto de keyframes debe generarse desde el storyboard v2 y la biblia 3D.

## Contenido versionado

- `content/season-01/episodes/`: manifiestos narrativos.
- `content/season-01/packages/`: estrategia de lanzamiento.
- `content/season-01/storyboards/`: guion técnico.
- `content/season-01/keyframes/`: conjuntos visuales y su estado.
- `content/characters/profiles/`: fichas maestras.
- `content/characters/model-sheets/`: referencias de modelo.
- `docs/LUMO_VISUAL_BIBLE.md`: dirección artística 3D.
- `docs/YOUTUBE_GROWTH_STRATEGY.md`: estrategia editorial y de distribución.

## Traspaso entre estudios

Las pantallas guardan paquetes temporales en `sessionStorage`:

- `lumo_image_studio_handoff_v1`
- `lumo_episode_launch_handoff_v1`
- `lumo_storyboard_handoff_v1`
- `lumo_keyframe_handoff_v1`

No contienen claves ni información personal.

## Validación

`npm run kids:validate` comprueba:

- Episodio y clasificación infantil.
- Paquete de lanzamiento y Shorts.
- Veinte escenas consecutivas hasta el segundo 360.
- Seis referencias maestras de personaje.
- Recursos, planos, cámara, diálogos, audio, iluminación y continuidad.
- Presencia de La Ronda de las Ideas y una resolución final.
- Fichas de personaje y listas negativas.
- Hojas de modelo y keyframes, incluidos conjuntos descartados.
- Revisión humana antes de cualquier aprobación o publicación.

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Aprobar la nueva historia y el diseño de Nublo.
2. Crear hojas de modelo 3D del reparto.
3. Producir keyframes 3D del robo, observatorio, canción y final.
4. Crear una animática de seis minutos.
5. Producir voces, canción, ambiente y efectos.
6. Modelar, riggear, animar, iluminar y renderizar.
7. Montar el episodio y derivar tres Shorts.
8. Ejecutar validación y revisión humana.
9. Exportar y publicar manualmente.

## Principio editorial

Las referencias de animación sirven para estudiar legibilidad, emoción, ritmo, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, planos ni argumentos.
