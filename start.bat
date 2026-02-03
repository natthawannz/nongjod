@echo off
REM เปิด frontend (Next.js) ในหน้าต่างแรก
start cmd /k "cd /d C:\dev\Balanz.ia && npm run dev"

REM เปิด backend (Node.js) ในหน้าต่างที่สอง
start cmd /k "cd /d C:\dev\Balanz.ia\backend && node index.js"

exit
