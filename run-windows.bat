@echo off
cd /d "C:\Users\moham\Desktop\Parts Mall 2016"
setlocal enabledelayedexpansion

echo ==========================================
echo    Parts Mall POS 2016 - Browser Selection
echo ==========================================
echo 1. Google Chrome
echo 2. Mozilla Firefox
echo 3. Microsoft Edge
echo 4. Default Browser
echo ==========================================
set /p choice="Choose your browser (1-4): "

set BROWSER_CMD=start ""

if "%choice%"=="1" set BROWSER_CMD=start chrome
if "%choice%"=="2" set BROWSER_CMD=start firefox
if "%choice%"=="3" set BROWSER_CMD=start msedge
if "%choice%"=="4" set BROWSER_CMD=start ""

echo Starting POS Management System...
%BROWSER_CMD% http://localhost:3000

npm run dev

echo.
echo Press any key to stop the server...
pause >nul
