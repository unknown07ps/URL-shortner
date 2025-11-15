@echo off
echo ============================================
echo   🚀 Pushing URL-shortner project to GitHub
echo ============================================

REM Set your GitHub username and repo name here
set USERNAME=unknown07ps
set REPO=URL-shortner

REM Initialize git (if not exists)
git init

REM Remove old origin if exists
git remote remove origin 2>nul

REM Add correct origin
git remote add origin https://github.com/%USERNAME%/%REPO%.git

REM Add all files
git add .

REM Commit files
git commit -m "Project update"

REM Push to GitHub
git branch -M main
git push -u origin main

echo.
echo ============================================
echo   ❤️  Push complete! Check your GitHub repo:
echo   https://github.com/%USERNAME%/%REPO%
echo ============================================
pause
