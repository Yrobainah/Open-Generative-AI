# Sistema operativo de producción de Lumo Kids

## Objetivo

Lumo Kids produce historias breves para preescolar que enseñan una conducta concreta, transmiten valores mediante decisiones de los personajes y mantienen una lectura visual atractiva. El director general coordina el flujo y solo escala al propietario por saldo insuficiente, un bloqueo que no pueda resolverse o la revisión del máster antes de YouTube.

## Autoridad

1. Yariel aprueba el Character Design y el máster final.
2. `config/lumo-canon-lock-v4.json` bloquea los bytes de los seis personajes y Brillavalle.
3. La Biblia Visual define el lenguaje permitido.
4. Los contratos y el storyboard definen qué sucede en un plano.
5. MuAPI genera candidatos; nunca redefine el canon.

Una diferencia de hash detiene la producción. Los laterales y espaldas están bloqueados hasta que existan vistas aprobadas; solo se aceptan frontal y tres cuartos.

## Equipo

Las ocho funciones están versionadas en `content/production/agent-team-v1.json`: historia educativa, guardián del canon, dirección visual, continuidad, presupuesto MuAPI, montaje/sonido, calidad infantil y entrega a YouTube. Ninguna función aprueba su propio resultado.

## Uso de las tres herramientas

- Caveman: solo comunicación técnica en modo `lite`. `compress`, `shrink` y cualquier reescritura creativa están bloqueados porque pueden alterar significado.
- Graphify: recibe primero `content/continuity/lumo-canonical-graph-v1.json`, construido de forma determinista desde JSON validados. Puede añadir relaciones de consulta, pero no modificar nodos `EXTRACTED`, aprobar imágenes ni redefinir el canon.
- Open-Generative-AI: entorno de producción. MuAPI solo se invoca después de validar canon, consultar saldo vivo, cotizar el payload exacto y reservar presupuesto.

## Puerta económica MuAPI

El saldo confirmado por Yariel el 4 de agosto de 2026 es `20,67 USD`. Antes de cada compra el sistema vuelve a consultar `GET /api/v1/account/balance`; el archivo no finge ser una lectura viva.

Flujo obligatorio:

1. Verificar hashes y referencias del plano.
2. Comprobar que no exista otra solicitud Lumo Kids activa.
3. Consultar saldo vivo.
4. Leer el modelo en `/api/v1/models/{model}` y, si es dinámico, cotizar el payload exacto en `estimate-cost`.
5. Aplicar máximo por generación, tope de etapa y reserva.
6. Enviar una sola solicitud.
7. Persistir `request_id` antes del primer sondeo.
8. Detener el sondeo ante `failed`, `error`, `cancelled` o `canceled`.
9. Guardar recibo con cotización, coste real, reembolso y saldo posterior.

Presupuesto protegido:

- Prueba reutilizable de 25 segundos: máximo `7,52 USD`.
- Microepisodio de 60 segundos: máximo total `16,44 USD`.
- Reserva: `4,23 USD`.
- Máximo de cualquier llamada individual: `2,25 USD`.

## Producción narrativa

`content/production/S01E01-microepisode-plan-v1.json` divide el episodio en cuatro bloques de 15 segundos: gancho, descubrimiento, solución cooperativa y recompensa. Cada bloque debe funcionar emocionalmente, enlazar con el anterior y enseñar mediante la acción.

La prueba de 25 segundos está en `content/production/jobs/S01E01-proof-v1.json`. No se extiende un plano rechazado y no hay reintento automático.

## YouTube automatizado

La automatización prepara metadatos y carga el vídeo como `private`, con `madeForKids=true` y declaración de contenido sintético. El cambio a público o la programación quedan bloqueados hasta que Yariel revise y apruebe el máster final. La puerta está en `content/production/youtube-release-gate-v1.json`.

## Validación

```bash
npm run kids:graph:canonical
npm run kids:validate
npm run kids:test
npm run build
```

La CI repite el grafo, la validación y las 15 pruebas cuando cambian canon, producción, seguridad o integración MuAPI.
