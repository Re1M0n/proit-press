$ErrorActionPreference = "Stop"
$backendRoot = Split-Path -Parent $PSScriptRoot

function Invoke-KilledMutation {
  param(
    [string]$Name,
    [string]$RelativePath,
    [string]$Original,
    [string]$Mutant,
    [string]$TestPath
  )

  $filePath = Join-Path $backendRoot $RelativePath
  $originalText = [System.IO.File]::ReadAllText($filePath)
  $matches = [regex]::Matches($originalText, [regex]::Escape($Original)).Count
  if ($matches -ne 1) {
    throw "Mutación '$Name': se esperaba una coincidencia exacta y se encontraron $matches en $RelativePath."
  }

  try {
    $mutatedText = $originalText.Replace($Original, $Mutant)
    [System.IO.File]::WriteAllText(
      $filePath,
      $mutatedText,
      [System.Text.UTF8Encoding]::new($false)
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = "Continue"
      $output = & npx jest $TestPath --runInBand --coverage=false 2>&1
      $exitCode = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    $output | ForEach-Object { Write-Output $_ }
    $outputText = $output -join [Environment]::NewLine

    if (
      $exitCode -eq 0 -or
      $outputText -match "Test suite failed to run" -or
      $outputText -notmatch "Tests:\s+\d+\s+failed"
    ) {
      throw "Mutación '$Name' no fue detectada por una aserción de test (exit $exitCode)."
    }

    Write-Output "Mutación '$Name': eliminada por los tests."
  }
  finally {
    [System.IO.File]::WriteAllText(
      $filePath,
      $originalText,
      [System.Text.UTF8Encoding]::new($false)
    )
    if ([System.IO.File]::ReadAllText($filePath) -cne $originalText) {
      throw "No se pudo restaurar el archivo original después de '$Name'."
    }
  }
}

Push-Location -LiteralPath $backendRoot
try {
  Invoke-KilledMutation `
    -Name "single-flight por sesión" `
    -RelativePath "src/services/WbotServices/WbotSessionCoordinator.ts" `
    -Original @'
    if (operations.start) {
      return operations.start;
    }
'@ `
    -Mutant @'
    if (operations.start && operations.active) {
      return operations.start;
    }
'@ `
    -TestPath "src/__tests__/unit/WbotSessionCoordinator.spec.ts"

  Invoke-KilledMutation `
    -Name "deduplicación de reconexión" `
    -RelativePath "src/services/WbotServices/WbotSessionCoordinator.ts" `
    -Original @'
    if (operations.reconnectTimer) {
      return;
    }
'@ `
    -Mutant @'
    if (false && operations.reconnectTimer) {
      return;
    }
'@ `
    -TestPath "src/__tests__/unit/WbotSessionCoordinator.spec.ts"

  Invoke-KilledMutation `
    -Name "no matar perfil propiedad de backend vivo" `
    -RelativePath "src/libs/ChromeOrphanRecovery.ts" `
    -Original '(await inspector.hasLivePressTicketOwner(candidate.pid))' `
    -Mutant 'false' `
    -TestPath "src/__tests__/unit/ChromeOrphanRecovery.spec.ts"
}
finally {
  Pop-Location
}
