@echo off
REM Microsoft Power Platform Admin Concierge - Setup Script (Windows)
REM This script installs all dependencies and sets up the development environment

echo 🚀 Setting up Microsoft Power Platform Admin Concierge...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Create environment files if they don't exist
echo 📄 Setting up environment files...

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo ✅ Created backend/.env from example
) else (
    echo ⚠️  backend/.env already exists
)

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Create data directory for SQLite database
echo 📁 Creating data directories...
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\logs" mkdir "backend\logs"

echo.
echo 🎉 Setup complete!
echo.
echo To start the development servers:
echo   npm run dev
echo.
echo Individual commands:
echo   Backend: npm run server:dev
echo   Frontend: npm run client:dev
echo.
echo 🌐 Application URLs:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:5000
echo.
echo 📚 Documentation:
echo   - Check README.md for detailed information
echo   - Review compliance checklist in the app
echo   - Explore Power Platform CLI commands
echo.
pause
