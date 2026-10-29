@echo off
echo ========================================================
echo        Pushing Party Play to GitHub (ThaniyalR)
echo ========================================================
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/ThaniyalR/party-play.git
git branch -M main
git push -u origin main
echo.
echo ========================================================
echo Done! Now opening Vercel to deploy...
echo ========================================================
start "" "https://vercel.com/new"
pause

