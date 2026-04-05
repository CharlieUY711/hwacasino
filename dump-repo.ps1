# dump-repo.ps1
# Correr desde la raiz del repositorio:
#   .\dump-repo.ps1
# Genera: repo-dump.txt con todo el contenido relevante

$output = "repo-dump.txt"
$root   = Get-Location

# Extensiones a incluir
$include = @("*.ts","*.tsx","*.js","*.jsx","*.json","*.sql","*.env.example","*.css","*.md")

# Carpetas a ignorar siempre
$excludeDirs = @("node_modules",".next",".git","dist","build",".vercel",".turbo","coverage","__pycache__")

"" | Set-Content $output -Encoding UTF8

function Should-Skip($path) {
    foreach ($d in $excludeDirs) {
        if ($path -match [regex]::Escape($d)) { return $true }
    }
    return $false
}

# 1. Arbol de carpetas
"=" * 60 | Add-Content $output
"ESTRUCTURA DEL REPOSITORIO" | Add-Content $output
"=" * 60 | Add-Content $output

Get-ChildItem -Recurse -Directory | Where-Object {
    -not (Should-Skip $_.FullName)
} | ForEach-Object {
    $rel = $_.FullName.Substring($root.Path.Length + 1)
    "  $rel" | Add-Content $output
}

"" | Add-Content $output

# 2. Contenido de cada archivo
$files = Get-ChildItem -Recurse -File -Include $include | Where-Object {
    -not (Should-Skip $_.FullName)
} | Sort-Object FullName

"Total archivos encontrados: $($files.Count)" | Add-Content $output
"" | Add-Content $output

foreach ($file in $files) {
    $rel = $file.FullName.Substring($root.Path.Length + 1)

    # Saltar archivos muy grandes (>500 KB)
    if ($file.Length -gt 512000) {
        "=" * 60 | Add-Content $output
        "ARCHIVO: $rel  [OMITIDO - demasiado grande: $([math]::Round($file.Length/1024))KB]" | Add-Content $output
        continue
    }

    "=" * 60    | Add-Content $output
    "ARCHIVO: $rel" | Add-Content $output
    "-" * 60    | Add-Content $output

    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        if ($content) {
            $content | Add-Content $output
        } else {
            "(archivo vacío)" | Add-Content $output
        }
    } catch {
        "(no se pudo leer: $_)" | Add-Content $output
    }

    "" | Add-Content $output
}

"=" * 60 | Add-Content $output
"FIN DEL DUMP" | Add-Content $output
"=" * 60 | Add-Content $output

Write-Host "Listo. Archivo generado: $output ($([math]::Round((Get-Item $output).Length/1024))KB)"
