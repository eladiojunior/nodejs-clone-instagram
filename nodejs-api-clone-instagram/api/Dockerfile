FROM node:14

WORKDIR /node-app

COPY package.json .
COPY . .

RUN npm install --quiet
RUN npm install nodemon -g --quiet

EXPOSE 8082