# Memoria de continuidad de Lumo Kids — canon v4

## Propósito

Esta memoria impide que generaciones independientes cambien personajes, voces, escenarios, objetos o reglas narrativas. Cada sección recibe un paquete mínimo de referencias; ningún modelo generativo se considera memoria canónica.

## Fuente de verdad y precedencia

La fuente visual maestra es `public/lumo-kids/canon/Character-Design-v4.png`, SHA-256 `a3163c83e64bdae0ace3afa99046a5cbd0022cdfbfdd5e76721753980912e1db`.

Orden obligatorio ante discrepancias:

1. Character Design maestro v4.
2. Recorte canónico v4 derivado del maestro.
3. Perfil JSON del personaje.
4. Contrato de sección y storyboard.
5. Prompt de generación.

Un prompt o resultado nunca puede redefinir el diseño maestro.

## Fuentes versionadas

- `public/lumo-kids/canon/`: diseño maestro y recortes operativos exactos.
- `content/characters/profiles/`: identidad de los seis protagonistas.
- `content/continuity/visual-assets-v1.json`: activos vigentes y retirados.
- `content/continuity/continuity-manifest.json`: índice y reglas globales.
- `content/continuity/environments/`: escenarios y vistas.
- `content/continuity/props/`: objetos y estados.
- `content/continuity/voices/`: personalidad y continuidad vocal.
- `content/continuity/cast/`: secundarios y reglas anticlones.
- `content/continuity/sections/`: contrato de cada bloque.

## Paquete de una sección

Cada bloque de 15 segundos utiliza:

1. Recortes v4 de los personajes presentes, y solo de esos personajes.
2. Storyboard exclusivo de la sección.
3. Referencia canónica del escenario y objetos visibles.
4. Último fotograma o vídeo anterior cuando mejore la continuidad.
5. Prompt derivado del contrato, por debajo de 10.000 caracteres.

Nunca se adjunta el tablero completo a ciegas si contiene personajes que no deben aparecer. Las láminas sirven como referencia, no como fotograma narrativo.

## Canon de personajes

- Lumo: dorado, redondeado, antenas ramificadas, ojos turquesa y corazón cian.
- Nara: criatura vegetal con corona de hojas, hojas laterales y falda de pétalos; sin flor amarilla.
- Tuno: mapache gris y crema, gafas de bronce, mono de trabajo y equipo de inventor; nunca bellota o madera.
- Biri: ave azul con cresta naranja de tres plumas, pico y patas naranjas.
- Pompón: criatura ovalada de pelaje lavanda con gran mechón morado; nunca musgo, semillas ni bolsa.
- Nublo: criatura felina-zorruna azul marino, orejas triangulares, ojos ámbar, farol cruzado y cola de niebla violeta.

Antes de generar se comprueba: una sola instancia por protagonista, ningún personaje prohibido, escala dentro de ±5 %, especie y accesorios exactos, solo habla quien corresponde y los oyentes reaccionan con la boca cerrada.

## Fuente y Corazón de Luz

La Fuente y el Corazón son objetos independientes. La Fuente conserva geometría, materiales y posición; puede estar `on`, `dim`, `off` o `restoring`.

El Corazón mantiene forma de corazón, núcleo blanco cálido, borde dorado, escala y altura. Nunca se convierte en esfera, gota, lámpara o cristal genérico.

## Voces y montaje

Las voces generadas son provisionales hasta aprobar una pista oficial. Cada diálogo registra personaje, texto, tiempo, emoción, interlocutor, gesto y reacción. Cuando sea posible, el narrador se produce como una sola pista estable.

Un defecto menor corregible por montaje, recorte, sonido o transición no justifica gastar otra generación. Se rechaza un clip si cambia especies o accesorios, duplica protagonistas, introduce un prohibido, deforma un objeto canónico o rompe el sentido del diálogo.

## Presupuesto protegido

Yariel confirmó el 4 de agosto de 2026 un saldo de `20,67 USD` y un máximo de `2,25 USD` por generación. Antes de cada compra se consulta el saldo vivo, se cotiza el payload exacto y se comprueba que no haya otra solicitud Lumo Kids activa.

Asignación de referencia, que debe reconfirmarse antes de gastar:

- Prueba de 25 segundos: máximo `7,52 USD`.
- Microepisodio de 60 segundos: máximo total `16,44 USD`.
- Reserva protegida: `4,23 USD`.

## Revisión antes de gastar

1. ¿Los recortes v4 corresponden exactamente al reparto visible?
2. ¿No aparece ningún personaje prohibido en imágenes o storyboard?
3. ¿La acción cabe en 15 segundos y enlaza con la sección anterior?
4. ¿Fuente, Corazón y Brillavalle conservan diseño y estado?
5. ¿No hay clones del reparto principal en el fondo?
6. ¿Diálogo, gestos, oyentes y audio están temporizados?
7. ¿El prompt está por debajo de 10.000 caracteres?
8. ¿Se solicita una sola variación?
9. ¿El saldo vivo y la cotización exacta respetan topes y reserva?
10. ¿No existe otra solicitud pagada activa y está preparado el registro del `request_id`?

`npm run kids:validate` comprueba estructura, referencias, checksum del maestro, activos canónicos, perfiles, contratos y límites seguros.
