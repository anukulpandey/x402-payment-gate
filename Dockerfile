# GateKeep app image — runs the API + gateway + built dashboard, and the
# chain deploy script. Used by both the `deployer` and `gatekeep` compose
# services.
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# App source + precompiled contract artifact.
COPY . .

# Build the React dashboard into web/dist (served by the server in production).
RUN npm run build

EXPOSE 4021

CMD ["npm", "start"]
