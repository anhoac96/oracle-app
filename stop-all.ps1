$ports = @(5000, 5001, 5173)

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "Port $port khong co tien trinh nao dang listen."
    continue
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Da dung process $processId tren port $port."
    } catch {
      Write-Host "Khong the dung process $processId tren port $port: $($_.Exception.Message)"
    }
  }
}
