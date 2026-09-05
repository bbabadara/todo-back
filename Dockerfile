FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget --spider -q http://127.0.0.1:3000/health || exit 1

USER node

CMD ["npm", "start"]