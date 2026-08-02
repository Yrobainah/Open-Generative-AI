# Lumo Kids Studio

## Alcance

Esta capa convierte Open Generative AI en un estudio de producción asistida para una serie infantil original. Lumo Kids añade organización narrativa, dirección visual 3D, consistencia de personajes, seguridad infantil, estrategia multiplataforma, guion técnico, pruebas de producción y revisión humana.

## Rutas

- `/studio/lumo-kids`: panel de temporada y episodios.
- `/studio/lumo-kids/characters`: biblioteca de los seis personajes del piloto.
- `/studio/lumo-kids/model-sheets/lumo`: referencia inicial de Lumo y traspaso hacia Image Studio.
- `/studio/lumo-kids/episodes/S01E01/package`: título, canción, Shorts y estrategia de distribución.
- `/studio/lumo-kids/episodes/S01E01/storyboard`: guion técnico y producción escena por escena.
- `/studio/lumo-kids/episodes/S01E01/keyframes`: registro del primer pase vectorial descartado.
- `/studio/lumo-kids/episodes/S01E01/proof`: prueba real de 25 segundos generada exclusivamente con los estudios de Open-Generative-AI.

## Dirección artística

La serie adopta animación 3D estilizada premium para preescolar:

- Personajes redondeados, suaves y muy expresivos.
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

Brillavalle se prepara para la Fiesta de las Mil Luces. Nublo, una criatura nocturna que se siente olvidada, toma el Corazón de Luz para iluminar una celebración solitaria. Lumo y sus amigos comparten sus propios destellos, siguen el rastro hasta el observatorio y atraviesan tres retos usando las habilidades de la pandilla. En lugar de recuperar la fuente por la fuerza, realizan La Ronda de las Ideas. Nublo comprende el daño, devuelve la luz y ayuda a llevarla a la plaza. La fiesta termina con fuegos artificiales mágicos y silenciosos.

## Guion técnico

El storyboard v2 contiene veinte escenas continuas entre `0:00` y `6:00`. Cada escena declara tiempo, objetivo, personajes, emoción, plano, cámara, acción, diálogo, audio, iluminación, recursos, continuidad y prompt 3D.

## Prueba real en Open-Generative-AI

Antes de producir los seis minutos se debe aprobar una secuencia real de 25 segundos:

1. `PT01`, 5 segundos: Nublo observa la fiesta.
2. `PT02`, 10 segundos: cuenta atrás, robo del Corazón de Luz y apagón.
3. `PT03`, 10 segundos: Nara reacciona y Lumo decide actuar.

El manifiesto se encuentra en:

`content/season-01/proofs/S01E01-theft-proof.json`

Los modelos recomendados dentro de Open-Generative-AI son:

- Image Studio: `nano-banana-2-edit`.
- Video Studio: `seedance-v2.0-i2v`.
- Audio Studio: `elevenlabs-text-to-dialogue-v3`.
- Lip Sync Studio: `infinitetalk-video-to-video`.

La pantalla de prueba copia el prompt del plano, abre el estudio correspondiente y permite registrar las URL reales devueltas por Open-Generative-AI. El estado permanece en producción mientras falte cualquiera de los siguientes elementos:

- un fotograma inicial por plano;
- un vídeo I2V por plano;
- audio para las líneas habladas;
- sincronización labial de `PT03`;
- montaje completo de 25 segundos;
- revisión humana.

No se aceptan imágenes estáticas con zoom, vídeos externos ni animáticas presentadas como animación terminada. El procedimiento completo está documentado en `docs/OGAI_PRODUCTION_PROOF.md`.

## Reparto

- Lumo: protagonista luminoso.
- Nara: guía serena.
- Tuno: inventor.
- Biri: explorador aéreo.
- Pompón: compañero sensible y cómico.
- Nublo: antagonista travieso que aprende a reparar el daño.

Las fichas maestras están en `content/characters/profiles/`.

## Paquete de lanzamiento

`content/season-01/packages/S01E01.launch.json` contiene el título público, la apertura, el concepto de miniatura, la canción original, la línea temporal, tres Shorts, nueve momentos de retención y los objetivos internos de medición.

## Keyframes anteriores

Los SVG del primer enfoque 2D tienen `status=superseded`. Se conservan solo para trazabilidad y no deben utilizarse como arte final, referencia 3D, miniatura ni material de producción.

## Contenido versionado

- `content/season-01/episodes/`: manifiestos narrativos.
- `content/season-01/packages/`: estrategia de lanzamiento.
- `content/season-01/storyboards/`: guion técnico.
- `content/season-01/keyframes/`: conjuntos visuales y su estado.
- `content/season-01/proofs/`: pruebas reales y resultados de generación.
- `content/characters/profiles/`: fichas maestras.
- `content/characters/model-sheets/`: referencias de modelo.
- `docs/LUMO_VISUAL_BIBLE.md`: dirección artística 3D.
- `docs/OGAI_PRODUCTION_PROOF.md`: flujo de la prueba real.
- `docs/YOUTUBE_GROWTH_STRATEGY.md`: estrategia editorial y de distribución.

## Traspaso entre estudios

Las pantallas guardan paquetes temporales en `sessionStorage`:

- `lumo_image_studio_handoff_v1`
- `lumo_episode_launch_handoff_v1`
- `lumo_storyboard_handoff_v1`
- `lumo_keyframe_handoff_v1`
- `lumo_ogai_proof_handoff_v1`

El registro local de resultados de la prueba utiliza:

- `lumo_ogai_proof_results_v1`

No contienen claves ni información personal.

## Validación

`npm run kids:validate` comprueba:

- episodio y clasificación infantil;
- paquete de lanzamiento y Shorts;
- veinte escenas consecutivas hasta el segundo 360;
- seis referencias maestras de personaje;
- recursos, cámara, diálogos, audio, iluminación y continuidad;
- presencia de La Ronda de las Ideas y una resolución final;
- fichas de personaje, hojas de modelo y conjuntos visuales descartados;
- plataforma, modelos, planos, duraciones y reglas de finalización de la prueba OGAI;
- prohibición de declarar terminada la prueba sin resultados reales;
- revisión humana antes de cualquier aprobación o publicación.

La misma validación se ejecuta en GitHub Actions.

## Flujo recomendado

1. Aprobar historia, reparto y dirección 3D.
2. Abrir la prueba OGAI desde el paquete del piloto.
3. Generar los tres fotogramas en Image Studio.
4. Animarlos en Video Studio.
5. Crear las voces en Audio Studio.
6. Aplicar sincronización labial a `PT03`.
7. Montar y revisar los 25 segundos.
8. Aprobar o rechazar el estándar visual y sonoro.
9. Solo después, escalar el flujo al episodio completo.

## Principio editorial

Las referencias de animación sirven para estudiar legibilidad, emoción, ritmo, humor, cooperación y resolución musical. No se copian personajes, diseños, nombres, canciones, diálogos, planos ni argumentos.
