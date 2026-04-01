# ──────────────────────────────────────────────
# Dockerfile for Squad-1 POS System (Next.js)
# ──────────────────────────────────────────────

# 1. BASE IMAGE
FROM node:20-alpine

# 2. WORKING DIRECTORY
WORKDIR /app

# 3. COPY PACKAGE FILES FIRST
COPY package*.json ./

# 4. INSTALL DEPENDENCIES
RUN npm install --legacy-peer-deps

# 5. COPY THE REST OF YOUR CODE
COPY . .

# 6. ENVIRONMENT VARIABLES
ENV WATCHPACK_POLLING=true

# 7. EXPOSE PORT
#    Next.js dev server runs on port 3000 by default
EXPOSE 3000

# 8. START COMMAND
CMD ["npm", "run", "dev"]