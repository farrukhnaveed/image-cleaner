FROM node:18

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY .env ./
COPY test-producer.js ./
COPY kafka-image-cleaner.js ./
RUN mkdir -p /app/logs

CMD ["npm", "start"]
