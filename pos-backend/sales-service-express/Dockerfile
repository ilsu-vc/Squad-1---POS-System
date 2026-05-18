FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json .npmrc ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4003
CMD ["npm", "start"]
