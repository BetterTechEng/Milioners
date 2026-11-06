@echo off
rem Double-click to run the game locally (installs dependencies the first time).
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js is not installed: https://nodejs.org & pause & exit /b 1)
if not exist node_modules (call npm install || (pause & exit /b 1))
call npm run dev
pause
