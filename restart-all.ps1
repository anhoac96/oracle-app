& "$PSScriptRoot\stop-all.ps1"
Start-Sleep -Seconds 2
Start-Process cmd -ArgumentList '/k', "cd /d `"$PSScriptRoot`" && node app.js"
Start-Process cmd -ArgumentList '/k', "cd /d `"$PSScriptRoot\server`" && npm run dev"
Start-Process cmd -ArgumentList '/k', "cd /d `"$PSScriptRoot\client`" && npm run dev"

Write-Host "Da restart:"
Write-Host "- Legacy app: http://localhost:5000"
Write-Host "- Backend API: http://localhost:5001"
Write-Host "- Frontend: http://localhost:5173"
