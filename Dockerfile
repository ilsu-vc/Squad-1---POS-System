# ──────────────────────────────────────────────
# Dockerfile for Squad-1 POS System (React CRA)
# ──────────────────────────────────────────────

# 1. BASE IMAGE
#    - node:20-alpine is a lightweight Node.js 20 image
#    - We use Node 20 because react-scripts 5 works best with it
#    - "alpine" = tiny Linux distro (~5 MB), keeps the image small
FROM node:20-alpine

# 2. WORKING DIRECTORY
#    - All subsequent commands run inside /app in the container
WORKDIR /app

# 3. COPY PACKAGE FILES FIRST
#    - Docker caches each layer. By copying package*.json first,
#      npm install only re-runs if dependencies change — saves time!
COPY package*.json ./

# 4. INSTALL DEPENDENCIES
#    - --legacy-peer-deps is needed because react-scripts 5 has
#      peer dependency conflicts with newer packages
RUN npm install --legacy-peer-deps

# 5. COPY THE REST OF YOUR CODE
#    - This copies everything (src/, public/, .env, etc.)
#    - Files in .dockerignore are excluded
COPY . .

# 6. ENVIRONMENT VARIABLES
#    - Needed for react-scripts 5 + Node 20 OpenSSL compatibility
#    - WATCHPACK_POLLING enables hot-reload inside Docker containers
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV WATCHPACK_POLLING=true

# 7. EXPOSE PORT
#    - React dev server runs on port 3000 by default
EXPOSE 3000

# 8. START COMMAND
#    - Runs "npm start" which triggers "react-scripts start" from package.json
CMD ["npm", "start"]