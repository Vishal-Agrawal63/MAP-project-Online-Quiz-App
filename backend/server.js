// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios'); // <-- Make sure axios is imported
require('dotenv').config(); // Load environment variables from .env

// --- Route Imports ---
const explanationRoute = require('./explanation'); // Assuming this file exists and exports a router

// --- Mongoose Models ---
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizDetail = require('./models/QuizDetail');
const LeaderboardEntry = require('./models/LeaderboardEntry');
const AiAccuracyLog = require('./models/AiAccuracyLog'); // <-- Import the new model

const app = express();
const port = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (adjust in production if needed)
app.use(express.json()); // Parse JSON request bodies

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1); // Exit if DB connection fails on startup
  });

// --- Helper Function for AI Prediction ---
async function getAiPrediction(questionText, options, correctAnswer) {
    console.log(`Asking AI for prediction on: "${questionText}"`);
    const model = 'openai/gpt-4o-mini'; // Or make dynamic based on env var

    const prompt = `Analyze the following multiple-choice question and determine the single best answer.
Question: "${questionText}"
Options:
${options.map((opt, index) => `- ${String.fromCharCode(65 + index)}: ${opt}`).join('\n')}

Respond ONLY with the letter of the correct option (e.g., A, B, C, D). Do not include explanation or any other text.`;

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 5,
                temperature: 0.2
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    // Optional but recommended headers:
                    'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:8080', // Adjust port if needed
                    'X-Title': process.env.YOUR_APP_NAME || 'QuizApp'
                },
                timeout: 15000 // 15 second timeout
            }
        );

        const rawResponse = response.data.choices[0]?.message?.content?.trim() || '';
        console.log(`AI Raw Response for Prediction: "${rawResponse}"`);

        let predictedAnswerText = null;
        let isCorrect = false;

        // Attempt 1: Exact letter match (A, B, C...) based on our prompt
        const letterMatch = rawResponse.match(/^[A-Z]$/i);
        if (letterMatch) {
             const predictedLetterIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65; // A=0, B=1,...
             if (predictedLetterIndex >= 0 && predictedLetterIndex < options.length) {
                 predictedAnswerText = options[predictedLetterIndex];
                 console.log(`AI Predicted via Letter (${letterMatch[0]}): ${predictedAnswerText}`);
             }
        }

        // Fallback: Check if the raw response contains the exact text of one of the options
        if (!predictedAnswerText) {
            for (const option of options) {
                 const regex = new RegExp(`\\b${option.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i'); // Whole word, case-insensitive
                 if (regex.test(rawResponse)) {
                     predictedAnswerText = option;
                     console.log(`AI Predicted via Text Match: ${predictedAnswerText}`);
                     break; // Take the first match
                 }
            }
        }

        if (predictedAnswerText) {
            isCorrect = predictedAnswerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        } else {
             console.warn(`Could not reliably parse AI prediction from: "${rawResponse}"`);
             predictedAnswerText = "Parsing Failed"; // Indicate failure
             isCorrect = false;
        }

        return {
            aiPredictedAnswer: predictedAnswerText,
            isAiCorrect: isCorrect,
            aiResponseRaw: rawResponse,
            aiModelUsed: model
        };

    } catch (error) {
        console.error('Error getting AI prediction:', error.response?.data || error.message);
        // Log specific axios error details if available
        if (error.response) {
            console.error("Axios Error Details:", { status: error.response.status, data: error.response.data });
        } else if (error.request) {
            console.error("Axios Error: No response received", error.request);
        } else {
             console.error("Axios Error Setup:", error.message);
        }
        return {
            aiPredictedAnswer: "Error Fetching",
            isAiCorrect: false,
            aiResponseRaw: error.message || "Unknown Axios Error",
            aiModelUsed: model
        };
    }
}


// --- API Endpoints ---

// Mount the explanation route (ensure explanation.js exports a router)
app.use('/', explanationRoute);

// GET /api/quizzes - Get list of all quizzes
app.get('/api/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find({}, 'quizId title description questionCount');
        res.json(quizzes);
    } catch (err) {
        console.error("Error fetching quizzes:", err);
        res.status(500).json({ message: 'Error fetching quiz list' });
    }
});

// GET /api/quizzes/:quizId - Get details for a specific quiz
app.get('/api/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    if (!quizId || /[\.\/]/.test(quizId)) {
         return res.status(400).json({ message: 'Invalid quiz ID format' });
    }

    try {
        const quizDetail = await QuizDetail.findOne({ quizId: quizId });
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

        // !! SECURITY WARNING: COMPARE HASHED PASSWORDS IN PRODUCTION !!
        // Replace this with bcrypt.compare()
        if (password !== user.password) {
             console.warn(`Login failed for ${username} (Incorrect password - using insecure comparison)`);
             return res.status(401).json({ message: 'Invalid username or password' });
        }

        console.log(`User logged in: ${username}`);
        res.json({ id: user._id, username: user.username }); // Use MongoDB _id

    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// POST /api/auth/signup - Handle user signup
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' }); // 409 Conflict
        }

        // !! SECURITY WARNING: HASH PASSWORD BEFORE SAVING IN PRODUCTION !!
        // Use bcrypt.hash() here
        const newUser = new User({
            username: username,
            password: password // Store HASHED password
        });

        const savedUser = await newUser.save();

        console.log(`User registered: ${username}`);
        res.status(201).json({ id: savedUser._id, username: savedUser.username }); // 201 Created

    } catch (err) {
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
        const leaderboard = await LeaderboardEntry.find({})
            .sort({ score: -1, timestamp: 1 }) // Score high to low, then oldest first for ties
            .limit(50); // Limit results

        res.json(leaderboard);
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});

// --- NEW: Endpoint for AI Accuracy Statistics ---
app.get('/api/ai-accuracy-stats', async (req, res) => {
    try {
        // Overall Accuracy
        const overallStats = await AiAccuracyLog.aggregate([
            { $match: { aiPredictedAnswer: { $nin: ["Error Fetching", "Parsing Failed"] } } }, // Exclude errors/failures from stats
            { $group: { _id: null, totalChecks: { $sum: 1 }, totalCorrect: { $sum: { $cond: ["$isAiCorrect", 1, 0] } } } },
            { $project: { _id: 0, totalChecks: 1, totalCorrect: 1, overallAccuracy: { $cond: [{ $eq: ["$totalChecks", 0] }, 0, { $divide: ["$totalCorrect", "$totalChecks"] }] } } }
        ]);

        // Accuracy per Quiz
        const perQuizStats = await AiAccuracyLog.aggregate([
             { $match: { aiPredictedAnswer: { $nin: ["Error Fetching", "Parsing Failed"] } } }, // Exclude errors/failures
             { $group: { _id: "$quizId", totalChecks: { $sum: 1 }, totalCorrect: { $sum: { $cond: ["$isAiCorrect", 1, 0] } } } },
             { $project: { quizId: "$_id", totalChecks: 1, totalCorrect: 1, accuracy: { $cond: [{ $eq: ["$totalChecks", 0] }, 0, { $divide: ["$totalCorrect", "$totalChecks"] }] }, _id: 0 } },
             { $sort: { quizId: 1 } }
        ]);

        res.json({
            overall: overallStats.length > 0 ? overallStats[0] : { totalChecks: 0, totalCorrect: 0, overallAccuracy: 0 },
            byQuiz: perQuizStats
        });

    } catch (err) {
        console.error("Error fetching AI accuracy stats:", err);
        res.status(500).json({ message: 'Error fetching AI accuracy statistics' });
    }
});

// POST /api/quizzes/:quizId/submit - Handle submission, update leaderboard, log AI accuracy
app.post('/api/quizzes/:quizId/submit', async (req, res) => {
    const { quizId } = req.params;
    const { userAnswers, userId } = req.body; // userId should be MongoDB _id

    // --- Basic Input Validation ---
    if (!userAnswers || typeof userAnswers !== 'object' || Object.keys(userAnswers).length === 0) {
        return res.status(400).json({ message: 'Valid user answers object is required' });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
         // Allow flexibility during transition? Or enforce strictly:
         return res.status(400).json({ message: 'Valid User ID (MongoDB ObjectId) is required' });
    }
    if (!quizId || /[\.\/]/.test(quizId)) {
        return res.status(400).json({ message: 'Invalid quiz ID format' });
    }

    let responseMessage = "Score calculated."; // Default status message

    try {
        // 1. Get correct answers for the quiz
        const quizDetail = await QuizDetail.findOne({ quizId: quizId });
        if (!quizDetail) {
            return res.status(404).json({ message: `Quiz '${quizId}' not found for submission` });
        }
        const questions = quizDetail.questions;
        const totalQuestions = questions.length;

        // 2. Calculate user score
        let calculatedScore = 0;
        questions.forEach(q => {
            // Ensure the user actually answered this question before checking
            if (userAnswers.hasOwnProperty(q.questionId) && userAnswers[q.questionId] === q.correctAnswer) {
                calculatedScore++;
            }
        });

        // --- 3. AI Accuracy Check (Run concurrently for performance) ---
        const accuracyPromises = questions
            .filter(q => userAnswers.hasOwnProperty(q.questionId)) // Only check questions the user answered
            .map(async (q) => {
                const predictionResult = await getAiPrediction(q.text, q.options, q.correctAnswer);
                const logEntry = new AiAccuracyLog({
                    quizId: quizId,
                    questionId: q.questionId,
                    questionText: q.text,
                    correctAnswer: q.correctAnswer,
                    aiPredictedAnswer: predictionResult.aiPredictedAnswer,
                    isAiCorrect: predictionResult.isAiCorrect,
                    aiResponseRaw: predictionResult.aiResponseRaw, // Store raw response for debugging
                    aiModelUsed: predictionResult.aiModelUsed,
                    // userId: userId, // Optionally store who triggered the check
                });
                try {
                    await logEntry.save();
                    // Optional: Log less verbosely in production
                    // console.log(`Accuracy logged for Q:${q.questionId} - Correct: ${predictionResult.isAiCorrect}`);
                } catch (logError) {
                    console.error(`Failed to save accuracy log for Q:${q.questionId}:`, logError);
                    // Decide if this error should fail the whole request or just be logged
                }
            });

        // Note: We don't necessarily need to `await Promise.all(accuracyPromises)`
        // *before* updating the leaderboard or responding to the user,
        // unless the user response *depends* on the accuracy check completing.
        // Letting them run in the background improves response time for the user.
        // However, wait for them if you *need* them done before proceeding.
        // For now, let's wait to ensure logging happens before response,
        // but consider the async approach if this endpoint becomes slow.
        try {
             await Promise.all(accuracyPromises);
             console.log(`AI Accuracy checks completed for quiz ${quizId} submission by user ${userId}.`);
        } catch(accuracyError) {
            // This catch is primarily for programming errors within the map/getAiPrediction,
            // as individual save errors are caught inside the map.
            console.error("Error occurred during AI accuracy check batch:", accuracyError);
            // Potentially inform the user or handle differently? For now, just log.
        }
        // --- End AI Accuracy Check ---


        // 4. Get username
        let username = "Unknown User";
        try {
             const user = await User.findById(userId).select('username');
             if (user) {
                 username = user.username;
             } else {
                 console.warn(`User ID ${userId} not found in users collection during submission.`);
                 // Maybe return an error if user *must* exist?
                 // return res.status(404).json({ message: `User ID ${userId} not found.` });
             }
        } catch (userErr) {
             console.error(`Could not fetch user ${userId} for leaderboard`, userErr);
             // Decide if this is critical
        }

        // 5. Update or Insert Leaderboard Entry
        const updateData = {
            // Fields present in both update and insert
            userId: userId,
            username: username, // Update username in case it changed
            quizId: quizId,
            totalQuestions: totalQuestions,
            timestamp: new Date() // Update timestamp on every attempt
        };

        let savedEntry;
        try {
             const existingEntry = await LeaderboardEntry.findOne({ userId: userId, quizId: quizId });

             if (existingEntry) {
                 // Entry exists, update only if new score is higher
                 if (calculatedScore > existingEntry.score) {
                     savedEntry = await LeaderboardEntry.findOneAndUpdate(
                         { _id: existingEntry._id },
                         { $set: { ...updateData, score: calculatedScore } }, // Add score to update
                         { new: true } // Return the updated document
                     );
                     responseMessage = "Score calculated. Leaderboard updated with higher score.";
                     console.log(`Leaderboard updated for ${username} on ${quizId}. New Score: ${calculatedScore}/${totalQuestions}`);
                 } else {
                     // Score not higher, potentially update timestamp/username if needed, but keep old score
                     savedEntry = await LeaderboardEntry.findOneAndUpdate(
                        { _id: existingEntry._id },
                        { $set: { username: username, timestamp: new Date() } }, // Update non-score fields
                        { new: true }
                    );
                     responseMessage = "Score calculated. Previous score on leaderboard was higher or equal.";
                     // console.log(`Leaderboard score not updated for ${username} on ${quizId}. Score ${calculatedScore} vs existing ${existingEntry.score}.`);
                 }
             } else {
                 // No existing entry, create a new one
                 savedEntry = await LeaderboardEntry.create({ ...updateData, score: calculatedScore });
                 responseMessage = "Score calculated. New entry added to leaderboard.";
                 console.log(`New leaderboard entry for ${username} on ${quizId}. Score: ${calculatedScore}/${totalQuestions}`);
             }
        } catch (leaderboardError) {
             console.error(`Error updating leaderboard for user ${userId}, quiz ${quizId}:`, leaderboardError);
             // Don't fail the whole request, but maybe change the message?
             responseMessage = "Score calculated, but failed to update leaderboard.";
             // Potentially set savedEntry = null or an error indicator
        }

        // 6. Respond to the user
        res.json({
            quizId: quizId,
            score: calculatedScore,
            totalQuestions: totalQuestions,
            message: responseMessage,
            // leaderboardEntry: savedEntry // Optional: send back the entry details
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