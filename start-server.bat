@echo off
title 5R Warehouse Patrol App - Server Aktif
color 0A
cls
echo.
echo  ================================================================
echo    5R WAREHOUSE PATROL ^& AUDIT TRACKER — SERVER JARINGAN
echo  ================================================================
echo.
echo  Mendeteksi IP jaringan Wi-Fi...
echo.

:: Get Wi-Fi IP (IPv4)
set IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    set RAW=%%a
    set RAW=!RAW: =!
    if not "!RAW!"=="" (
        if not defined IP set IP=!RAW!
    )
)

:: Enable delayed expansion for variable in loop
setlocal enabledelayedexpansion
set IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    set "RAW=%%a"
    set "RAW=!RAW: =!"
    if not "!RAW!"=="" (
        if not defined IP (
            set "IP=!RAW!"
        )
    )
)

if "%IP%"=="" set IP=localhost

echo  [OK] IP Terdeteksi: %IP%
echo.
echo  ================================================================
echo.
echo   Akses dari PC (lokal):
echo     http://localhost:8080/
echo.
echo   Akses dari HP / Tablet (Wi-Fi yang sama):
echo     http://%IP%:8080/
echo.
echo   ATAU scan QR Code di dalam aplikasi (klik ikon QR di navbar)
echo.
echo  ================================================================
echo.
echo  Membuka aplikasi di browser...
echo.
start http://localhost:8080/

echo  Server berjalan di port 8080. Tekan Ctrl+C untuk berhenti.
echo  Jangan tutup jendela ini selama HP ingin mengakses aplikasi!
echo.

:: Run built-in PowerShell HTTP server on port 8080
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = 8080;" ^
  "$root = '%~dp0';" ^
  "$listener = New-Object System.Net.HttpListener;" ^
  "$listener.Prefixes.Add('http://+:' + $port + '/');" ^
  "try { $listener.Start() } catch {" ^
  "  $listener2 = New-Object System.Net.HttpListener;" ^
  "  $listener2.Prefixes.Add('http://localhost:' + $port + '/');" ^
  "  $listener2.Start();" ^
  "  $listener = $listener2;" ^
  "};" ^
  "Write-Host '  [RUNNING] Server aktif — siap diakses dari HP!' -ForegroundColor Green;" ^
  "Write-Host '' ;" ^
  "while ($listener.IsListening) {" ^
  "  $ctx = $listener.GetContext();" ^
  "  $relPath = $ctx.Request.Url.LocalPath.TrimStart('/');" ^
  "  if ([string]::IsNullOrEmpty($relPath) -or $relPath -eq '/') { $relPath = 'index.html'; };" ^
  "  $filePath = Join-Path $root $relPath;" ^
  "  $response = $ctx.Response;" ^
  "  $response.Headers.Add('Access-Control-Allow-Origin', '*');" ^
  "  if (Test-Path $filePath -PathType Leaf) {" ^
  "    $bytes = [System.IO.File]::ReadAllBytes($filePath);" ^
  "    $ext = [System.IO.Path]::GetExtension($filePath).ToLower();" ^
  "    $ct = switch ($ext) {" ^
  "      '.html' { 'text/html; charset=utf-8' }" ^
  "      '.css'  { 'text/css; charset=utf-8' }" ^
  "      '.js'   { 'application/javascript; charset=utf-8' }" ^
  "      '.json' { 'application/json' }" ^
  "      '.png'  { 'image/png' }" ^
  "      '.jpg'  { 'image/jpeg' }" ^
  "      '.jpeg' { 'image/jpeg' }" ^
  "      '.svg'  { 'image/svg+xml' }" ^
  "      '.ico'  { 'image/x-icon' }" ^
  "      '.webp' { 'image/webp' }" ^
  "      default { 'application/octet-stream' }" ^
  "    };" ^
  "    $response.ContentType = $ct;" ^
  "    $response.ContentLength64 = $bytes.Length;" ^
  "    $response.OutputStream.Write($bytes, 0, $bytes.Length);" ^
  "    Write-Host ('  GET ' + $relPath) -ForegroundColor DarkGray;" ^
  "  } else {" ^
  "    $response.StatusCode = 404;" ^
  "    Write-Host ('  404 NOT FOUND: ' + $relPath) -ForegroundColor Red;" ^
  "  };" ^
  "  $response.Close();" ^
  "}"
pause
