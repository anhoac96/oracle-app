$services = @(
  @{ Name = "Legacy app"; Port = 5000; Url = "http://localhost:5000" },
  @{ Name = "Backend API"; Port = 5001; Url = "http://localhost:5001/api/health" },
  @{ Name = "Frontend"; Port = 5173; Url = "http://localhost:5173" }
)

foreach ($service in $services) {
  $connection = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($connection) {
    Write-Host "[RUNNING] $($service.Name) - Port $($service.Port) - PID $($connection.OwningProcess) - $($service.Url)"
  } else {
    Write-Host "[STOPPED] $($service.Name) - Port $($service.Port) - $($service.Url)"
  }
}
