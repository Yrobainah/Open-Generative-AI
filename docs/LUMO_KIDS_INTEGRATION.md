# Lumo Kids AI Studio

Esta rama convierte el fork de Open Generative AI en la base de un estudio para una serie infantil original.

## Integraciones

- Open Generative AI: aplicación y motores multimedia.
- Caveman: herramienta de desarrollo instalada solo para Codex; no modifica el contenido infantil.
- Graphify: grafo local del código, la documentación y los manifiestos narrativos.
- Kids Safety Layer: validación automática y revisión humana obligatoria.

Las versiones externas están fijadas en `config/integrations.lock.json`. Los scripts las descargan dentro de `tools/`, una carpeta excluida de Git.

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

## Reglas editoriales

- Ningún episodio se publica sin revisión humana.
- No se almacenan claves ni datos personales de menores.
- Las referencias externas solo aportan patrones narrativos abstractos.
- No se copian personajes, diseños, voces, canciones, títulos ni argumentos.
