@echo off
echo ============================================
echo   🚀 Pushing URL-shortner project to GitHub
echo ============================================

REM Set your GitHub username here
set USERNAME=unknown07ps    REM <-- your GitHub username
set REPO=URL-shortner

REM Initialize git if not already
git init

REM Add all files
git add .

REM Commit with message
git commit -m "Initial commit - URL Shortener backend"

REM Remove old origin if any
git remote remove origin 2>nul

REM Add remote origin
git remote add origin https://github.com/%USERNAME%/%REPO%.git

REM Push to GitHub
git branch -M main
git push -u origin main

echo.
echo ============================================
echo   ✅  Push complete! Check https://github.com/%USERNAME%/%%REPO%
echo ============================================
pause
