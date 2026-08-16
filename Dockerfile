# Build do app Next (web/) com o SQLite da raiz do repo dentro da imagem.
# Usado pelo Coolify (build pack: Dockerfile). node:sqlite exige Node >= 22.5.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY web/package.json web/package-lock.json ./
RUN npm ci --include=dev
COPY web/ ./
COPY riftbound.db ./riftbound.db
RUN npm run build && npm prune --omit=dev
EXPOSE 3032
CMD ["npm", "run", "start"]
