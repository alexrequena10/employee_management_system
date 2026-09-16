FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install --prefix server && npm install --prefix client

COPY server ./server
COPY client ./client

RUN npm run build --prefix client

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "src/index.js"]
