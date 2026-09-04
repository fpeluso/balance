FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_FILE=/app/data/finance.json

WORKDIR /app

COPY package.json ./
COPY src ./src

RUN addgroup -S finance \
    && adduser -S -G finance finance \
    && mkdir -p /app/data \
    && chown -R finance:finance /app

USER finance

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
