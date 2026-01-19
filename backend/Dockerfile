FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY migrations ./migrations
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/index.js"]
