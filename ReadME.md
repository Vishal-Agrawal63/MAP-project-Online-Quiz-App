Build and Run with Docker Compose:

Open your terminal in the your-project-root directory (where docker-compose.yml is located).

Build and start the services:

docker-compose up --build
Use code with caution.
Bash
--build: Forces Docker Compose to rebuild the images based on your Dockerfiles. You only need this flag the first time or when you change a Dockerfile or the source code included in the build.

up: Creates and starts the containers. You'll see logs from both the backend and frontend (Nginx) in your terminal.

Wait for the build process to complete and for both containers to start up and show logs indicating they are running (e.g., backend listening on port 3001, Nginx starting).

Access your application in your web browser at: http://localhost:8080

Your Quiz App should now be running! The React frontend is served by Nginx, and Nginx forwards API calls starting with /api/ to your Node.js backend container. Data written by the backend (new users, leaderboard entries) will be saved in the backend/data folder on your host machine.

To Stop the Application:

Press Ctrl+C in the terminal where docker-compose up is running.

To remove the containers (but keep the volume data), run: docker-compose down

To stop without removing: docker-compose stop