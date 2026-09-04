@echo off
REM ============================================================
REM  Nexus - sobe o worker do WhatsApp + o tunel Cloudflare
REM  Cada um abre em sua propria janela. Mantenha as duas abertas.
REM ============================================================

set WORKER_DIR=C:\Users\giuli\Desktop\PDFInder\wa-worker

echo.
echo  ============================================
echo    NEXUS - iniciando worker e tunel
echo  ============================================
echo.
echo  Abrindo duas janelas:
echo    1) Worker do WhatsApp (porta 3001)
echo    2) Tunel Cloudflare (endereco publico)
echo.
echo  LEMBRETE: o endereco do tunel MUDA a cada vez.
echo  Copie o link .trycloudflare.com da janela do tunel
echo  e atualize WA_WORKER_URL na Vercel (depois: Redeploy).
echo.
pause

REM --- Janela 1: worker ---
start "Nexus - Worker WhatsApp" cmd /k "cd /d %WORKER_DIR% && npm start"

REM --- espera uns segundos pro worker subir antes do tunel ---
timeout /t 6 /nobreak >nul

REM --- Janela 2: tunel ---
start "Nexus - Tunel Cloudflare" cmd /k "cd /d %WORKER_DIR% && .\cloudflared.exe tunnel --url http://localhost:3001"

echo.
echo  Pronto! As duas janelas foram abertas.
echo  - Escaneie o QR se o worker pedir (WhatsApp desconectado).
echo  - Copie o link do tunel e cole na Vercel se ele mudou.
echo.
echo  Para PARAR tudo: feche as duas janelas abertas.
echo.
pause
