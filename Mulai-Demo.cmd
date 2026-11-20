@echo off
setlocal
cd /d "%~dp0"
if not exist "frontend\dist\index.html" (
  pushd frontend
  call npm.cmd run build
  if errorlevel 1 goto gagal
  popd
)
pushd backend
call npm.cmd run demo
if errorlevel 1 goto gagal
node scripts/launch.js
if errorlevel 1 goto gagal
exit /b 0
:gagal
echo Demo belum dapat dimulai. Periksa pesan di atas dan layanan MySQL.
pause
exit /b 1
