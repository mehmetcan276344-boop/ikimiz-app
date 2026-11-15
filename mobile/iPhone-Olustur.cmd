@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
 echo Node.js 24 LTS ve npm gerekiyor: https://nodejs.org
 pause
 exit /b 1
)
call npm ci
if errorlevel 1 goto fail
call npx expo install --check
if errorlevel 1 goto fail
call npx --yes eas-cli@27.7.2 whoami >nul 2>nul
if errorlevel 1 (
 call npx --yes eas-cli@27.7.2 login
 if errorlevel 1 goto fail
)
call npx --yes eas-cli@27.7.2 build --platform ios --profile preview
if errorlevel 1 goto fail
pause
exit /b 0
:fail
echo Derleme tamamlanamadi. Yukaridaki hata giderilmeden kurulum dosyasi hazir degildir.
pause
exit /b 1
