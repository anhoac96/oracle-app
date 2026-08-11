@echo off
setlocal

cd /d "%~dp0"

start "oracle-app-legacy-5000" cmd /k "node app.js"
start "oracle-app-backend-5001" cmd /k "cd /d %~dp0server && npm run dev"
start "oracle-app-frontend-5173" cmd /k "cd /d %~dp0client && npm run dev"

echo Da khoi dong:
echo - Legacy app: http://localhost:5000
echo - Backend API: http://localhost:5001
echo - Frontend: http://localhost:5173

endlocal
