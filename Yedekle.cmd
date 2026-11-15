@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 set "IKIMIZ_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
) else (
 set "IKIMIZ_NODE=node"
)
"%IKIMIZ_NODE%" --env-file-if-exists=.env scripts\backup.mjs
pause
