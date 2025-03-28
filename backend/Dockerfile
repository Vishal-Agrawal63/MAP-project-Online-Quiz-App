# backend/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copy package files and install *only production* dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application code and data
# Copy data first maybe? Or copy all source code.
COPY . .
# Ensure the 'data' directory is copied (it should be if you use 'COPY . .')

# Expose the port the backend runs on
EXPOSE 3001

# Command to run the application
CMD ["node", "server.js"]