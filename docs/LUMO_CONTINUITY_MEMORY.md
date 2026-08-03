# Lumo Continuity Memory

## Propósito

Esta memoria canónica evita que las generaciones independientes cambien personajes, voces, escenarios, objetos o reglas narrativas. Ningún modelo generativo conserva por sí solo una memoria fiable entre solicitudes: cada sección debe recibir un paquete mínimo de referencias derivado de estos archivos.

La memoria complementa `docs/LUMO_VISUAL_BIBLE.md`. La biblia visual define la dirección artística; esta memoria fija identidades verificables, estados y traspasos entre clips.

## Fuentes de verdad

- `content/characters/profiles/`: identidad de los seis protagonistas.
- `content/continuity/continuity-manifest.json`: índice y reglas globales.
- `content/continuity/environments/`: escenarios canónicos y sus vistas.
- `content/continuity/props/`: objetos recurrentes y estados permitidos.
- `content/continuity/voices/`: personalidad, ritmo y continuidad vocal.
- `content/continuity/cast/`: secundarios autorizados y reglas anticlones.
- `content/continuity/sections/`: contrato visual y narrativo de cada bloque.

Cuando dos documentos discrepen, gana el recurso de mayor especificidad: `section > prop/environment/voice > character profile > visual bible`.

## Identificadores canónicos iniciales

- `ENV-BRILLAVALLE-PLAZA-001`: plaza central.
- `PROP-FOUNTAIN-OF-LIGHT-001`: fuente central.
- `PROP-HEART-OF-LIGHT-001`: Corazón de Luz.
- `VOICE-BIBLE-LUMO-KIDS-001`: voces y narrador.
- `CAST-SECONDARY-CITIZENS-001`: biblioteca de habitantes.

No deben inventarse variantes como si fueran objetos nuevos. Los cambios de iluminación o daño se expresan mediante estados del mismo identificador.

## Paquete de generación de una sección

Cada bloque de 15 segundos utiliza:

1. Storyboard exclusivo de la sección, sin sucesos futuros.
2. Hoja de reparto con solo los personajes presentes.
3. Referencia canónica de escenario y objetos visibles.
4. Último fotograma o vídeo anterior cuando mejore la continuidad.
5. Prompt derivado del contrato de sección, por debajo de 10.000 caracteres.

El storyboard general del episodio es planificación, no referencia de producción: contiene demasiados personajes, textos y acontecimientos futuros.

## Vídeos ancla y extensiones

- Crear un vídeo ancla con I2V al cambiar de localización, reparto principal o estado visual importante.
- Usar Seedance Extend mientras continúen lugar, reparto, iluminación y acción.
- Revisar después de cada extensión.
- No encadenar más de tres extensiones sin volver a anclar con referencias canónicas.
- No extender desde un final narrativamente incorrecto: Extend heredará sus errores.

## Continuidad de personajes

Una exclusión escrita no vence a un personaje visible en una referencia. Las hojas por sección deben omitir físicamente a los personajes prohibidos.

Antes de generar:

- exactamente un ejemplar de cada protagonista presente;
- ninguna figura prohibida en storyboard o referencias;
- colores, especie, silueta y accesorios coinciden con su perfil;
- relación de escala con Lumo dentro de ±5 %;
- solo mueve la boca quien habla;
- oyentes mantienen boca cerrada, contacto visual y reacción legible.

## Fuente y Corazón de Luz

La fuente y el Corazón son objetos independientes.

La fuente conserva siempre su geometría, materiales, altura, número de niveles y posición en la plaza. Puede estar `on`, `dim`, `off` o `restoring`.

El Corazón conserva forma de corazón, núcleo blanco cálido, borde dorado, escala y altura de flotación. Puede estar `safe-floating`, `being-stolen`, `carried`, `being-returned` o `restored`. Nunca se convierte en esfera, gota, lámpara o cristal genérico.

## Voces

Seedance puede producir una actuación convincente, pero no garantiza una voz idéntica entre trabajos. La memoria vocal fija registro, ritmo, emoción y frases. Las voces generadas sirven como interpretación provisional; una pista oficial puede reemplazarlas durante el montaje sin cambiar el texto ni la duración.

Cada diálogo registra:

- personaje;
- texto exacto;
- inicio y final;
- emoción;
- interlocutor;
- gesto;
- reacción del oyente;
- archivo definitivo cuando exista.

El narrador se produce como una única voz estable fuera de los clips cuando sea posible.

## Secundarios sin clones

Los secundarios de primer plano deben provenir de `CAST-SECONDARY-CITIZENS-001`. Las multitudes lejanas pueden usar siluetas variadas, nunca copias de protagonistas.

Prohibiciones permanentes:

- ningún secundario dorado con antenas y corazón como Lumo;
- ninguna silueta verde de hojas como Nara;
- ningún mapache con las mismas gafas, rostro y uniforme de Tuno;
- ningún ave azul con cresta naranja como Biri;
- ninguna criatura redonda, morada y esponjosa como Pompón;
- ningún zorro/lobo azul violeta con ojos ámbar y cola de niebla como Nublo.

## Revisión antes de gastar créditos

1. ¿El storyboard contiene solo los 15 segundos previstos?
2. ¿El reparto de referencia coincide exactamente con `charactersPresent`?
3. ¿No aparece ningún `characterForbidden` en las imágenes?
4. ¿Escenario, fuente y Corazón usan sus diseños y estados canónicos?
5. ¿Los secundarios son especies y siluetas distintas?
6. ¿El inicio enlaza con la sección anterior y el final con la siguiente?
7. ¿Diálogo, voces, gestos y oyentes están temporizados?
8. ¿La música evita una cadencia final cuando el episodio continúa?
9. ¿El prompt está por debajo de 10.000 caracteres y apunta a 7.500 o menos?
10. ¿Hay una sola generación seleccionada?

## Aprobación de resultados

Un clip se aprueba cuando conserva identidades, estados y lectura narrativa. Los defectos menores que puedan resolverse con montaje, recorte, sonido o transición no justifican regenerar. Un clip se rechaza si introduce personajes prohibidos, cambia un objeto canónico de forma irreconocible, altera voces o diálogo de manera que rompa la historia, duplica protagonistas o adelanta sucesos futuros.

`npm run kids:validate` comprueba que la memoria y los contratos de sección tengan la estructura mínima, referencias válidas, reparto sin contradicciones y límites de prompt seguros.