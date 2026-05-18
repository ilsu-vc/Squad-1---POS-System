FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json .npmrc ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4005
CMD ["npm", "run", "start:prod"]
