@echo off
echo ============================================
echo   🚀 Syncing and Pushing URL-shortner to GitHub
echo ============================================

REM GitHub username and repo
set USERNAME=unknown07ps
set REPO=URL-shortner

REM Go to script directory (IMPORTANT)
cd /d "%~dp0"

REM Ensure .gitignore exists
echo node_modules/ > .gitignore
echo .env >> .gitignore

REM Initialize git (if needed)
git init

REM Add remote (but remove old if exists)
git remote remove origin 2>nul
git remote add origin https://github.com/%USERNAME%/%REPO%.git

REM Pull GitHub changes with auto-merge
git pull origin main --allow-unrelated-histories --no-edit

REM Add project files except ignored ones
git add .

REM Commit update
git commit -m "Sync + Update project"

REM Push to GitHub
git branch -M main
git push -u origin main

echo.
echo ============================================
echo   ❤️  Push Complete! Check your GitHub:
echo   https://github.com/%USERNAME%/%REPO%
echo ============================================
pause
