// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Use promises for async file reading
const path = require('path');

const app = express();
const port = 3001; // Choose a port different from your React app (Vite usually uses 5173)

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helpers ---
const dataPath = path.join(__dirname, 'data');
const usersFilePath = path.join(dataPath, 'users.json');
const leaderboardPath = path.join(dataPath, 'leaderboard.json');

// Helper function to read JSON file safely
async function readJsonFile(filePath, defaultData = []) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`File not found: ${filePath}. Returning default data.`);
            return defaultData; // Return default if file doesn't exist
        }
        console.error(`Error reading or parsing JSON file: ${filePath}`, error);
        // Decide how to handle corrupted files - maybe throw error or return default
        return defaultData; // Return default on parse error for simplicity here
    }
}

// Helper function to write JSON file safely
async function writeJsonFile(filePath, data) {
    try {
        const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON
        await fs.writeFile(filePath, jsonData, 'utf8');
    } catch (error) {
        console.error(`Error writing JSON file: ${filePath}`, error);
        throw new Error(`Failed to write to file: ${path.basename(filePath)}`); // Propagate error
    }
}

// --- API Endpoints ---

// GET /api/quizzes - Get list of all quizzes
app.get('/api/quizzes', async (req, res) => {
    try {
        const filePath = path.join(dataPath, 'quizzes.json');
        const data = await fs.readFile(filePath, 'utf8'); // Use fs.readFile directly here as it's simpler
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("Error reading quizzes.json:", err);
        res.status(500).json({ message: 'Error fetching quiz list' });
    }
});

// GET /api/quizzes/:quizId - Get details for a specific quiz
app.get('/api/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    if (!quizId || quizId.includes('..') || quizId.includes('/')) {
        return res.status(400).json({ message: 'Invalid quiz ID' });
    }
    const filePath = path.join(dataPath, 'quizDetails', `${quizId}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).json({ message: `Quiz '${quizId}' not found` });
        } else {
            console.error(`Error reading quiz ${quizId}:`, err);
            res.status(500).json({ message: 'Error fetching quiz data' });
        }
    }
});

// POST /api/auth/login - Handle user login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const users = await readJsonFile(usersFilePath, []);
        const user = users.find(u => u.username === username && u.password === password); // PLAIN TEXT CHECK! INSECURE!

        if (user) {
            res.json({ id: user.id, username: user.username }); // Don't send password back
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// POST /api/auth/signup - Handle user signup AND SAVE TO FILE
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        let users = await readJsonFile(usersFilePath, []);

        // Check if username already exists
        if (users.some(u => u.username === username)) {
            return res.status(409).json({ message: 'Username already exists' }); // 409 Conflict
        }

        // Create new user object
        const newUser = {
            id: `user_${Date.now()}`, // Simple unique ID
            username: username,
            password: password // WARNING: STORING PLAIN TEXT PASSWORD - HIGHLY INSECURE
        };

        // Add new user to the array
        users.push(newUser);

        // Write the updated users array back to the file
        await writeJsonFile(usersFilePath, users);

        console.log(`User registered: ${username}`);
        // Respond with new user info (excluding password)
        res.status(201).json({ id: newUser.id, username: newUser.username }); // 201 Created

    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).json({ message: err.message || 'Server error during signup' });
    }
});

// GET /api/leaderboard - Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await readJsonFile(leaderboardPath, []);

        // Sort leaderboard data
        const sortedData = [...leaderboard].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.totalQuestions - b.totalQuestions; // Higher score first, then fewer questions
        });

        res.json(sortedData);
    } catch (err) {
        console.error("Error reading leaderboard:", err);
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});

// POST /api/quizzes/:quizId/submit - Handle quiz submission AND SAVE TO LEADERBOARD
app.post('/api/quizzes/:quizId/submit', async (req, res) => {
    const { quizId } = req.params;
    const { userAnswers, userId } = req.body;

    if (!userAnswers) {
        return res.status(400).json({ message: 'User answers are required' });
    }
     if (!userId) {
        // For simplicity, we require userId now to add to leaderboard properly
        return res.status(400).json({ message: 'User ID is required for submission' });
    }
    if (!quizId || quizId.includes('..') || quizId.includes('/')) {
        return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quizFilePath = path.join(dataPath, 'quizDetails', `${quizId}.json`);

    try {
        // 1. Get correct answers for the quiz
        const quizDataRaw = await fs.readFile(quizFilePath, 'utf8');
        const quizData = JSON.parse(quizDataRaw);
        const questions = quizData.questions;

        // 2. Calculate score
        let calculatedScore = 0;
        questions.forEach(q => {
            if (userAnswers[q.id] === q.correctAnswer) {
                calculatedScore++;
            }
        });
        const totalQuestions = questions.length;

        // 3. Get username from userId
        let username = "Unknown User";
        try {
             const users = await readJsonFile(usersFilePath, []);
             const user = users.find(u => u.id === userId);
             if (user) {
                 username = user.username;
             } else {
                 console.warn(`User ID ${userId} not found in users.json for leaderboard entry.`);
             }
        } catch (userErr) {
             console.error("Could not read users.json to get username for leaderboard", userErr);
        }


        // 4. Read, Update, and Write Leaderboard
        try {
            let leaderboardData = await readJsonFile(leaderboardPath, []);

            const newEntry = {
                userId: userId,
                username: username,
                quizId: quizId,
                score: calculatedScore,
                totalQuestions: totalQuestions,
                timestamp: new Date().toISOString() // Add timestamp for potential future use
            };

            leaderboardData.push(newEntry);

            await writeJsonFile(leaderboardPath, leaderboardData);
            console.log(`Leaderboard updated for ${username} on quiz ${quizId}. Score: ${calculatedScore}/${totalQuestions}`);

        } catch (leaderboardErr) {
             // Log the error but continue to respond to the user
            console.error(`!!! Failed to update leaderboard file: ${leaderboardPath}`, leaderboardErr);
            // Don't throw here, just notify failure in response maybe?
        }

        // 5. Respond with the calculated score
        res.json({
            quizId: quizId,
            score: calculatedScore,
            totalQuestions: totalQuestions,
            message: "Score calculated and leaderboard update attempted." // Updated message
        });

    } catch (err) {
        // Handle errors fetching quiz details or other unexpected errors
        if (err.code === 'ENOENT' && err.path === quizFilePath) {
            res.status(404).json({ message: `Quiz '${quizId}' not found for submission` });
        } else {
            console.error(`Error processing submission for quiz ${quizId}:`, err);
            res.status(500).json({ message: err.message || 'Error processing quiz submission' });
        }
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});