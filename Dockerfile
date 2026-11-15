FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM deps AS verify
COPY *.mjs ./
COPY test ./test
COPY mobile ./mobile
COPY public ./public
COPY scripts ./scripts
RUN npm test && touch /tmp/tests-passed

FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache su-exec
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY *.mjs ./
COPY public ./public
COPY scripts ./scripts
COPY --from=verify /tmp/tests-passed /tmp/tests-passed
RUN mkdir -p /app/data && chown node:node /app/data && chmod +x /app/scripts/docker-entrypoint.sh
ENV PORT=8787 SECURE_COOKIES=1 DATA_DIR=/app/data
EXPOSE 8787
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "server.mjs"]
