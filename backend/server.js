// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose'); // Import mongoose
require('dotenv').config(); // Load environment variables from .env

const app = express();
const port = process.env.PORT || 3001; // Use environment variable for port too


// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1); // Exit if DB connection fails on startup
  });

  
  
// --- Mongoose Models ---
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizDetail = require('./models/QuizDetail');
const LeaderboardEntry = require('./models/LeaderboardEntry');
  
  
// --- API Endpoints ---

// GET /api/quizzes - Get list of all quizzes
app.get('/api/quizzes', async (req, res) => {
    try {
        // Find all documents, select only needed fields if desired
        const quizzes = await Quiz.find({}, 'quizId title description questionCount');
        // Mongoose returns documents; convert to plain objects if necessary (usually not needed)
        res.json(quizzes);
    } catch (err) {
        console.error("Error fetching quizzes:", err);
        res.status(500).json({ message: 'Error fetching quiz list' });
    }
});

// GET /api/quizzes/:quizId - Get details for a specific quiz
app.get('/api/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    // Basic validation (you might add more)
    if (!quizId || /[\.\/]/.test(quizId)) { // Prevent path traversal
         return res.status(400).json({ message: 'Invalid quiz ID format' });
    }

    try {
        const quizDetail = await QuizDetail.findOne({ quizId: quizId }); // Find by your custom 'quizId'
        if (!quizDetail) {
            return res.status(404).json({ message: `Quiz '${quizId}' not found` });
        }
        res.json(quizDetail);
    } catch (err) {
        console.error(`Error fetching quiz ${quizId}:`, err);
        res.status(500).json({ message: 'Error fetching quiz data' });
    }
});

// POST /api/auth/login - Handle user login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username: username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // !! SECURITY WARNING: COMPARE HASHED PASSWORDS !!
        // In a real app, you would hash the incoming password and compare it to the stored hash.
        // Example using bcrypt (after installing bcrypt: npm install bcrypt):
        // const bcrypt = require('bcrypt');
        // const isMatch = await bcrypt.compare(password, user.password);
        // if (!isMatch) {
        //    return res.status(401).json({ message: 'Invalid username or password' });
        // }

        // Plain text comparison (INSECURE - FOR DEMO ONLY)
        if (password !== user.password) {
             console.warn(`Login failed for ${username} (Incorrect password - using insecure comparison)`);
             return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Login successful
        console.log(`User logged in: ${username}`);
        // Send back MongoDB's _id as the user ID
        res.json({ id: user._id, username: user.username });

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
        // Check if username already exists
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' }); // 409 Conflict
        }

        // !! SECURITY WARNING: HASH PASSWORD BEFORE SAVING !!
        // Example using bcrypt:
        // const bcrypt = require('bcrypt');
        // const saltRounds = 10; // Adjust cost factor as needed
        // const hashedPassword = await bcrypt.hash(password, saltRounds);
        // const newUser = new User({ username: username, password: hashedPassword });

        // Create new user (INSECURE - PLAIN TEXT PASSWORD)
        const newUser = new User({
            username: username,
            password: password // Store hashed password here in production!
        });

        // Save the new user to the database
        const savedUser = await newUser.save();

        console.log(`User registered: ${username}`);
        // Respond with new user info (excluding password)
        // Send MongoDB's _id as the user ID
        res.status(201).json({ id: savedUser._id, username: savedUser.username }); // 201 Created

    } catch (err) {
        // Handle potential validation errors from Mongoose
        if (err.name === 'ValidationError') {
             return res.status(400).json({ message: err.message });
        }
        console.error("Error during signup:", err);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// GET /api/leaderboard - Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
    try {
        // Fetch entries, sort by score descending, then timestamp ascending (earlier is better for ties)
        const leaderboard = await LeaderboardEntry.find({})
            .sort({ score: -1, timestamp: 1 }) // Sort by score (high to low), then time (old to new for ties)
            .limit(50); // Optional: Limit the number of results

        res.json(leaderboard);
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});

// POST /api/quizzes/:quizId/submit - Handle quiz submission AND UPDATE/SAVE TO LEADERBOARD
app.post('/api/quizzes/:quizId/submit', async (req, res) => {
    const { quizId } = req.params;
    const { userAnswers, userId } = req.body; // userId is now MongoDB's _id

    // --- Basic Input Validation ---
    if (!userAnswers || typeof userAnswers !== 'object') {
        return res.status(400).json({ message: 'User answers object is required' });
    }
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required for submission' });
    }
    if (!quizId || /[\.\/]/.test(quizId)) {
        return res.status(400).json({ message: 'Invalid quiz ID format' });
    }
    // Validate if userId looks like a MongoDB ObjectId (optional but good)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
         // return res.status(400).json({ message: 'Invalid User ID format' });
         // Or handle cases where your old string IDs might still be sent during transition
         console.warn(`Received potentially non-ObjectId userId: ${userId}`);
    }


    let responseMessage = "Score calculated.";

    try {
        // 1. Get correct answers for the quiz
        const quizDetail = await QuizDetail.findOne({ quizId: quizId });
        if (!quizDetail) {
            return res.status(404).json({ message: `Quiz '${quizId}' not found for submission` });
        }
        const questions = quizDetail.questions;
        const totalQuestions = questions.length;

        // 2. Calculate score
        let calculatedScore = 0;
        questions.forEach(q => {
            // Use questionId (renamed from id in schema)
            if (userAnswers[q.questionId] === q.correctAnswer) {
                calculatedScore++;
            }
        });

        // 3. Get username from userId
        let username = "Unknown User";
        try {
             const user = await User.findById(userId).select('username'); // Fetch only username
             if (user) {
                 username = user.username;
             } else {
                 console.warn(`User ID ${userId} not found in users collection.`);
             }
        } catch (userErr) {
             console.error(`Could not fetch user ${userId} for leaderboard`, userErr);
        }

        // 4. Update or Insert Leaderboard Entry using findOneAndUpdate with upsert
        const updateData = {
            userId: userId,
            username: username, // Update username in case it changed
            quizId: quizId,
            totalQuestions: totalQuestions,
            timestamp: new Date() // Update timestamp on every attempt
            // We only update score if it's higher
        };

        const existingEntry = await LeaderboardEntry.findOne({ userId: userId, quizId: quizId });

        let savedEntry;
        if (existingEntry) {
            // Entry exists, update only if new score is higher
            if (calculatedScore > existingEntry.score) {
                updateData.score = calculatedScore; // Set the new higher score
                savedEntry = await LeaderboardEntry.findOneAndUpdate(
                    { _id: existingEntry._id }, // Find by existing entry's ID
                    { $set: updateData }, // Use $set to update specific fields
                    { new: true } // Return the updated document
                );
                responseMessage = "Score calculated. Leaderboard updated with higher score.";
                console.log(`Leaderboard updated for ${username} (${userId}) on quiz ${quizId}. New Score: ${calculatedScore}/${totalQuestions}`);
            } else {
                // Score not higher, do nothing to the score field
                savedEntry = existingEntry; // Keep the old entry data
                responseMessage = "Score calculated. Previous score on leaderboard was higher or equal.";
                console.log(`Leaderboard not updated for ${username} (${userId}) on quiz ${quizId}. Score ${calculatedScore}/${totalQuestions} is not higher than existing ${existingEntry.score}/${existingEntry.totalQuestions}.`);
            }
        } else {
            // No existing entry, create a new one
            updateData.score = calculatedScore; // Set score for the new entry
            savedEntry = await LeaderboardEntry.create(updateData);
            responseMessage = "Score calculated. New entry added to leaderboard.";
            console.log(`New leaderboard entry added for ${username} (${userId}) on quiz ${quizId}. Score: ${calculatedScore}/${totalQuestions}`);
        }


        // 5. Respond with the calculated score and status message
        res.json({
            quizId: quizId,
            score: calculatedScore,
            totalQuestions: totalQuestions,
            message: responseMessage,
            leaderboardEntry: savedEntry // Optional: send back the entry details
        });

    } catch (err) {
        console.error(`Error processing submission for quiz ${quizId}:`, err);
        // Check for specific Mongoose errors if needed
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(400).json({ message: 'Invalid User ID format provided.' });
        }
        res.status(500).json({ message: err.message || 'Error processing quiz submission' });
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});