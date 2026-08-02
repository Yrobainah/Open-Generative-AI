# Prueba real de producción en Open-Generative-AI

## Objetivo

Antes de producir el episodio completo se generará una secuencia real de 25 segundos dentro de Open-Generative-AI. La prueba cubre el momento en que Nublo observa la fiesta, toma el Corazón de Luz y Lumo decide recuperarlo con sus amigos.

Esta prueba sustituye a la animática externa anterior. No se utilizarán renderizadores, generadores de vídeo ni sintetizadores de voz ajenos al flujo de Open-Generative-AI.

## Ruta

`/studio/lumo-kids/episodes/S01E01/proof`

La pantalla organiza los planos, copia los prompts, abre cada estudio y registra las URL de los resultados reales.

## Manifiesto

`content/season-01/proofs/S01E01-theft-proof.json`

Contiene:

- tres planos de 5, 10 y 10 segundos;
- prompts separados de fotograma y movimiento;
- diálogo, dirección interpretativa y diseño sonoro;
- modelos recomendados de Open-Generative-AI;
- referencias obligatorias;
- criterios de aprobación por plano;
- reglas que impiden declarar la prueba terminada sin resultados reales.

## Modelos recomendados

### Image Studio

- Modelo: `nano-banana-2-edit`
- Uso: crear un fotograma inicial por plano.
- Referencias: Lumo, Nublo, plaza, Corazón de Luz y biblia visual.
- Salida: imagen `16:9` con continuidad de personajes y materiales.

### Video Studio

- Modelo: `seedance-v2.0-i2v`
- Uso: animar cada fotograma inicial.
- Duraciones: `5`, `10` y `10` segundos.
- Salida: tres clips con actuación, cámara e iluminación reales.

### Audio Studio

- Modelo: `elevenlabs-text-to-dialogue-v3`
- Uso: generar las líneas de Nara, Lumo y la cuenta atrás.
- Requisito: voces expresivas en español, diferenciadas, sin tono robótico ni exageración de bebé.

### Lip Sync Studio

- Modelo: `infinitetalk-video-to-video`
- Uso: sincronizar el primer plano hablado de `PT03`.
- Requisito: conservar ojos, forma de boca, proporciones y material facial de Lumo.

## Orden de producción

1. Abrir `PT01` y generar el fotograma inicial en Image Studio.
2. Registrar su URL y animarlo en Video Studio durante 5 segundos.
3. Repetir el proceso para `PT02` y `PT03` con 10 segundos cada uno.
4. Generar el diálogo de `PT02` y `PT03` en Audio Studio.
5. Aplicar la voz final al vídeo de `PT03` mediante Lip Sync Studio.
6. Montar los tres clips, música, ambientes y efectos.
7. Registrar la URL del montaje de 25 segundos.
8. Revisar emoción, continuidad, voces, sincronización, cámara y legibilidad.
9. Aprobar o rechazar la dirección antes de producir el episodio de seis minutos.

## Registro y bloqueo de finalización

La pantalla guarda temporalmente las URL en `localStorage` bajo:

`lumo_ogai_proof_results_v1`

El traspaso a los estudios se guarda en `sessionStorage` bajo:

`lumo_ogai_proof_handoff_v1`

La prueba solo puede considerarse completa cuando existen:

- tres fotogramas iniciales generados;
- tres vídeos I2V generados;
- audio de todas las líneas habladas;
- sincronización labial de `PT03`;
- montaje final de 25 segundos;
- revisión humana.

## Criterios globales

- La emoción debe entenderse sin depender del texto.
- Nublo debe resultar travieso y vulnerable, nunca aterrador.
- Lumo debe pasar de preocupación a decisión mediante actuación facial y corporal.
- La iluminación nocturna debe mantener los ojos y bocas legibles.
- El Corazón de Luz debe conservar tamaño, material y color entre planos.
- No puede cambiar el diseño, la paleta ni la escala de los personajes.
- Las voces deben sonar naturales, cálidas y dirigidas frase por frase.
- No se aceptarán diapositivas, zooms sobre imágenes estáticas ni montaje presentado como animación final.
