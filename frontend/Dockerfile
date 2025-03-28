# frontend/Dockerfile

# ---- Build Stage ----
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    # Copy package files and install dependencies
    COPY package.json package-lock.json* ./
    RUN npm ci
    
    # Copy the rest of the application source code
    COPY . .
    
    # Build the React application
    # Check your package.json - Vite's default build script is 'build'
    RUN npm run build
    
    # ---- Production Stage ----
    FROM nginx:1.25-alpine AS production
    
    # Remove default nginx static assets
    RUN rm -rf /usr/share/nginx/html/*
    
    # Copy static build files from the 'builder' stage
    # Vite builds to 'dist' by default
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # Copy our custom Nginx configuration
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Expose port 80 (Nginx default)
    EXPOSE 80
    
    # Nginx image already has a command to start nginx, e.g., CMD ["nginx", "-g", "daemon off;"]
    # So no CMD is needed here unless overriding.