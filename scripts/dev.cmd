@echo off
rem Levanta backend y frontend en dos ventanas.
start "SimpleGrow backend" cmd /k call "%~dp0dev-backend.cmd"
timeout /t 3 /nobreak >nul
start "SimpleGrow frontend" cmd /k call "%~dp0dev-frontend.cmd"
