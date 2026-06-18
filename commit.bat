@echo off
chcp 65001 >nul
echo ========================================
echo   GastosTicketsFactures - Commit i Push
echo ========================================
echo.
set /p MSG="Missatge del commit: "
if "%MSG%"=="" (
  echo Error: el missatge no pot estar buit.
  pause
  exit /b 1
)
git add .
git commit -m "%MSG%"
git push
echo.
echo Fet! Prem una tecla per tancar.
pause >nul
