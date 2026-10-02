@echo off
rem Arranca el backend FastAPI usando el Python del venv (no el global).
cd /d "%~dp0..\apps\backend"
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
