FROM node:22-alpine

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
