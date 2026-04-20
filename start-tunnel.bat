@echo off
echo =========================================
echo  OPERATION DEEPFAULT — Tunnel Launcher
echo =========================================
echo.

:: Build the React app
echo [1/3] Building frontend...
cmd /c npm run build

echo.
echo [2/3] Restarting backend server...
:: Kill old node server.js if running
taskkill /F /IM node.exe /FI "WINDOWTITLE eq server*" 2>nul
timeout /t 1 /nobreak >nul
start "CTF Backend" cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Cloudflare Tunnel...
echo       Share the URL below with players!
echo       (Press Ctrl+C in the tunnel window to stop)
echo.
cloudflared tunnel --url http://localhost:4000
