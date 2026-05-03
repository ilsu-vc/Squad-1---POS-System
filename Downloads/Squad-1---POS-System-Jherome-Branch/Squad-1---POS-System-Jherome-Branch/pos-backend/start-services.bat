@echo off
echo Starting all POS Microservices and API Gateway...

echo Copying root .env to microservices...
copy /Y ..\.env auth-service\.env > nul
copy /Y ..\.env api-gateway\.env > nul
copy /Y ..\.env inventory-service\.env > nul
copy /Y ..\.env sales-service\.env > nul
copy /Y ..\.env reporting-service\.env > nul
copy /Y ..\.env role-service\.env > nul
copy /Y ..\.env receipt-service\.env > nul
copy /Y ..\.env transaction-service\.env > nul

start "API Gateway (8000)" cmd /k "cd api-gateway && npm run start:dev"
start "Auth Service (4001)" cmd /k "cd auth-service && npm run start:dev"
start "Inventory Service (4002)" cmd /k "cd inventory-service && npm run start:dev"
start "Sales Service (4003)" cmd /k "cd sales-service && npm run start:dev"
start "Reporting Service (4004)" cmd /k "cd reporting-service && npm run start:dev"
start "Role Service (4005)" cmd /k "cd role-service && npm run start:dev"
start "Receipt Service (4006)" cmd /k "cd receipt-service && npm run start:dev"
start "Transaction Service (4007)" cmd /k "cd transaction-service && npm run start:dev"

echo All microservices are opening in new terminal windows!
echo Make sure to keep your existing "npm run dev" window open for the frontend.
