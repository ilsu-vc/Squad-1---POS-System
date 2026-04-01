@echo off
echo Starting all POS Microservices...

echo Copying root .env to microservices...
copy /Y .env services\auth-service\.env > nul
copy /Y .env services\product-service\.env > nul
copy /Y .env services\sales-service\.env > nul
copy /Y .env services\reporting-service\.env > nul
copy /Y .env services\role-service\.env > nul
copy /Y .env services\receipt-service\.env > nul

start "Auth Service (4001)" cmd /k "cd services\auth-service && npm run dev"
start "Product Service (4002)" cmd /k "cd services\product-service && npm run dev"
start "Sales Service (4003)" cmd /k "cd services\sales-service && npm run dev"
start "Reporting Service (4004)" cmd /k "cd services\reporting-service && npm run dev"
start "Role Service (4005)" cmd /k "cd services\role-service && npm run dev"
start "Receipt Service (4006)" cmd /k "cd services\receipt-service && npm run dev"

echo All microservices are opening in new terminal windows!
echo Make sure to keep your existing "npm run dev" window open for the frontend.
