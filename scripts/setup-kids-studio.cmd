@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

echo [1/6] Comprobando herramientas...
where git >nul 2>&1 || (echo ERROR: Git no esta instalado.& exit /b 1)
where node >nul 2>&1 || (echo ERROR: Node.js no esta instalado.& exit /b 1)
where npm >nul 2>&1 || (echo ERROR: npm no esta instalado.& exit /b 1)
where uv >nul 2>&1 || (echo ERROR: uv no esta instalado. Ejecuta: winget install astral-sh.uv& exit /b 1)

echo [2/6] Descargando herramientas externas fijadas...
if not exist "tools\caveman\.git" git clone https://github.com/JuliusBrussee/caveman.git tools\caveman || exit /b 1
git -C tools\caveman fetch --depth 1 origin 0d95a81d35a9f2d123a5e9430d1cfc43d55f1bb0 || exit /b 1
git -C tools\caveman checkout --detach 0d95a81d35a9f2d123a5e9430d1cfc43d55f1bb0 || exit /b 1
if not exist "tools\graphify\.git" git clone --branch v8 https://github.com/Graphify-Labs/graphify.git tools\graphify || exit /b 1
git -C tools\graphify fetch --depth 1 origin 00efd6e7969837ae4a9f11d8d504dcd3b20b09df || exit /b 1
git -C tools\graphify checkout --detach 00efd6e7969837ae4a9f11d8d504dcd3b20b09df || exit /b 1

echo [3/6] Instalando Caveman para Codex...
node tools\caveman\bin\install.js --only codex --minimal --non-interactive || exit /b 1

echo [4/6] Instalando Graphify desde la copia fijada...
uv tool install .\tools\graphify --force || exit /b 1
graphify install --project --platform codex || exit /b 1

echo [5/6] Instalando y compilando Open Generative AI...
call npm install || exit /b 1
call npm run build:packages || exit /b 1

echo [6/6] Validando contenido y creando el grafo...
call npm run kids:validate || exit /b 1
call npm run kids:graph || exit /b 1

echo.
echo Integracion local terminada correctamente.
endlocal
