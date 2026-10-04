FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY services/connector-broker/package.json ./services/connector-broker/package.json
COPY services/connector-broker/src ./services/connector-broker/src

RUN cd services/connector-broker && npm install --omit=dev --ignore-scripts
RUN mkdir -p /var/lib/agentpop/connector-broker && \
    chown -R node:node /var/lib/agentpop/connector-broker

EXPOSE 7070
USER node
CMD ["node", "services/connector-broker/src/server.mjs"]
