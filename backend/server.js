// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios'); // Essential for API calls
require('dotenv').config(); // Load environment variables from .env

// --- Route Imports ---
// Assuming explanation.js exports an Express Router correctly
const explanationRoute = require('./explanation');

// --- Mongoose Models ---
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizDetail = require('./models/QuizDetail');
const LeaderboardEntry = require('./models/LeaderboardEntry');
const AiAccuracyLog = require('./models/AiAccuracyLog');
const AiGeneratedQuestionLog = require('./models/AiGeneratedQuestionLog'); // Import for generator

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

// --- Helper Function for AI Prediction (Accuracy Check) ---
async function getAiPrediction(questionText, options, correctAnswer) {
    console.log(`Asking AI for prediction on: "${questionText}"`);
    const model = 'openai/gpt-4o-mini';

    const prompt = `Analyze the following multiple-choice question and determine the single best answer.
Question: "${questionText}"
Options:
${options.map((opt, index) => `- ${String.fromCharCode(65 + index)}: ${opt}`).join('\n')}

Respond ONLY with the letter of the correct option (e.g., A, B, C, D). Do not include explanation or any other text.`;

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
             { model: model, messages: [{ role: 'user', content: prompt }], max_tokens: 5, temperature: 0.2 },
             {
                 headers: {
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                     'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:8080',
                     'X-Title': process.env.YOUR_APP_NAME || 'QuizApp'
                 },
                 timeout: 15000
             }
        );

        // --- PARSING LOGIC (Condensed from previous example) ---
        const rawResponse = response.data.choices[0]?.message?.content?.trim() || '';
        let predictedAnswerText = null;
        let isCorrect = false;
        const letterMatch = rawResponse.match(/^[A-Z]$/i);
        if (letterMatch) {
            const predictedLetterIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
            if (predictedLetterIndex >= 0 && predictedLetterIndex < options.length) {
                predictedAnswerText = options[predictedLetterIndex];
            }
        }
        if (!predictedAnswerText) { // Fallback Check
             for (const option of options) {
                 const regex = new RegExp(`\\b${option.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
                 if (regex.test(rawResponse)) {
                      predictedAnswerText = option;
                      break;
                 }
             }
        }
        if (predictedAnswerText) {
            isCorrect = predictedAnswerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        } else {
             console.warn(`Could not reliably parse AI prediction from: "${rawResponse}"`);
             predictedAnswerText = "Parsing Failed";
             isCorrect = false;
        }
         return { aiPredictedAnswer: predictedAnswerText, isAiCorrect: isCorrect, aiResponseRaw: rawResponse, aiModelUsed: model };
         // --- End Condensed Parsing ---

    } catch (error) {
        console.error('Error getting AI prediction:', error.response?.data || error.message);
        if (error.response) { console.error("Axios Error Details:", { status: error.response.status, data: error.response.data }); }
        return { aiPredictedAnswer: "Error Fetching", isAiCorrect: false, aiResponseRaw: error.message || "Unknown Axios Error", aiModelUsed: model };
    }
}

// --- Helper Function for AI Question Generation ---
async function generateQuestionWithAi(topic) {
    console.log(`Asking AI to generate question for topic: "${topic}"`);
    const model = 'openai/gpt-4o-mini'; // Or make dynamic

    const prompt = `Generate a single, high-quality multiple-choice quiz question suitable for a general knowledge quiz, based on the topic "${topic}".
Provide the output strictly in the following format, with each part on a new line:
Question: [The question text]
A: [Option A text]
B: [Option B text]
C: [Option C text]
D: [Option D text]
Correct Answer: [The letter of the correct option, e.g., B]

Ensure the question is clear, the options are distinct, and only one option is definitively correct. Do not include any other text, introductions, or explanations.`;

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.7 },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:8080',
                    'X-Title': process.env.YOUR_APP_NAME || 'QuizApp'
                },
                timeout: 25000
            }
        );

        const rawResponse = response.data.choices[0]?.message?.content?.trim() || '';
        console.log(`AI Raw Response for Generation: \n"${rawResponse}"`);

        // --- PARSING LOGIC ---
        let questionText = null;
        const options = {};
        let correctLetter = null;
        let parsingSuccessful = false;
        const lines = rawResponse.split('\n');
        const prefixes = { "Question:": "questionText", "A:": "A", "B:": "B", "C:": "C", "D:": "D", "Correct Answer:": "correctLetter" };
        const extracted = {};

        lines.forEach(line => {
            const trimmedLine = line.trim();
            for (const prefix in prefixes) {
                if (trimmedLine.startsWith(prefix)) {
                    const value = trimmedLine.substring(prefix.length).trim();
                    const key = prefixes[prefix];
                    if (key === "questionText" || key === "correctLetter") { extracted[key] = value; }
                    else { options[key] = value; }
                    break;
                }
            }
        });
        questionText = extracted.questionText;
        correctLetter = extracted.correctLetter?.toUpperCase().charAt(0);
        if (questionText && options.A && options.B && options.C && options.D && correctLetter && options[correctLetter]) {
            parsingSuccessful = true;
            console.log("AI Question Response Parsed Successfully.");
        } else {
            console.error("Failed to parse AI question response structure.");
            console.log("Extracted for Debug:", { questionText, options, correctLetter });
        }

        return {
            success: parsingSuccessful,
            questionText: questionText,
            optionsArray: parsingSuccessful ? [options.A, options.B, options.C, options.D] : [],
            correctAnswerText: parsingSuccessful ? options[correctLetter] : null,
            rawResponse: rawResponse,
            modelUsed: model,
            error: parsingSuccessful ? null : "Failed to parse response structure."
        };

    } catch (error) {
        console.error('Error generating question with AI:', error.response?.data || error.message);
        if (error.response) { console.error("Axios Error Details:", { status: error.response.status, data: error.response.data }); }
        return { success: false, questionText: null, optionsArray: [], correctAnswerText: null, rawResponse: error.message || "Unknown Axios Error", modelUsed: model, error: error.message || "API call failed." };
    }
}


// --- API Endpoints ---

// Mount the explanation route
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
            console.warn(`Login attempt failed for non-existent user: ${username}`);
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        // !! SECURITY WARNING: COMPARE HASHED PASSWORDS IN PRODUCTION !!
        if (password !== user.password) {
             console.warn(`Login failed for ${username} (Incorrect password - using insecure comparison)`);
             return res.status(401).json({ message: 'Invalid username or password' });
        }
        console.log(`User logged in: ${username}`);
        res.json({ id: user._id, username: user.username });
    } catch (err) {
        console.error("Error during login for user:", username, err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// POST /api/auth/signup - Handle user signup
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ message: 'Username and password are required' }); }
    if (password.length < 6) { return res.status(400).json({ message: 'Password must be at least 6 characters long' }); }
    try {
        const existingUser = await User.findOne({ username: username });
        if (existingUser) { return res.status(409).json({ message: 'Username already exists' }); }
        // !! SECURITY WARNING: HASH PASSWORD BEFORE SAVING IN PRODUCTION !!
        const newUser = new User({ username: username, password: password /* HASHED password */ });
        const savedUser = await newUser.save();
        console.log(`User registered: ${username}`);
        res.status(201).json({ id: savedUser._id, username: savedUser.username });
    } catch (err) {
        if (err.name === 'ValidationError') { return res.status(400).json({ message: err.message }); }
        console.error("Error during signup:", err);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// GET /api/leaderboard - Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await LeaderboardEntry.find({})
            .sort({ score: -1, timestamp: 1 }).limit(50);
        res.json(leaderboard);
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});

// GET /api/ai-accuracy-stats - Get aggregated AI accuracy data
app.get('/api/ai-accuracy-stats', async (req, res) => {
    try {
        // Define aggregation pipelines (make sure they are correct)
         const overallPipeline = [
             { $match: { aiPredictedAnswer: { $nin: ["Error Fetching", "Parsing Failed"] } } },
             { $group: { _id: null, totalChecks: { $sum: 1 }, totalCorrect: { $sum: { $cond: ["$isAiCorrect", 1, 0] } } } },
             { $project: { _id: 0, totalChecks: 1, totalCorrect: 1, overallAccuracy: { $cond: [{ $eq: ["$totalChecks", 0] }, 0, { $divide: ["$totalCorrect", "$totalChecks"] }] } } }
         ];
         const perQuizPipeline = [
              { $match: { aiPredictedAnswer: { $nin: ["Error Fetching", "Parsing Failed"] } } },
              { $group: { _id: "$quizId", totalChecks: { $sum: 1 }, totalCorrect: { $sum: { $cond: ["$isAiCorrect", 1, 0] } } } },
              { $project: { quizId: "$_id", totalChecks: 1, totalCorrect: 1, accuracy: { $cond: [{ $eq: ["$totalChecks", 0] }, 0, { $divide: ["$totalCorrect", "$totalChecks"] }] }, _id: 0 } },
              { $sort: { quizId: 1 } }
         ];
        const overallStats = await AiAccuracyLog.aggregate(overallPipeline);
        const perQuizStats = await AiAccuracyLog.aggregate(perQuizPipeline);
        res.json({
            overall: overallStats.length > 0 ? overallStats[0] : { totalChecks: 0, totalCorrect: 0, overallAccuracy: 0 },
            byQuiz: perQuizStats
        });
    } catch (err) {
        console.error("Error fetching AI accuracy stats:", err);
        res.status(500).json({ message: 'Error fetching AI accuracy statistics' });
    }
});

// POST /api/generate-question - Trigger AI question generation
app.post('/api/generate-question', async (req, res) => {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
        return res.status(400).json({ success: false, message: 'A valid topic is required.' });
    }
    const trimmedTopic = topic.trim();
    console.log(`Received request to generate question for topic: "${trimmedTopic}"`);

    const generationResult = await generateQuestionWithAi(trimmedTopic);

    let logStatus = 'pending_review';
    if (!generationResult.success) {
        logStatus = generationResult.error === "Failed to parse response structure." ? 'parsing_failed' : 'generation_failed';
    }

    const logEntry = new AiGeneratedQuestionLog({
        topic: trimmedTopic,
        generatedQuestionText: generationResult.questionText,
        generatedOptions: generationResult.optionsArray,
        generatedCorrectAnswer: generationResult.correctAnswerText,
        aiModelUsed: generationResult.modelUsed,
        rawAiResponse: generationResult.rawResponse,
        status: logStatus,
    });

    try {
        const savedLog = await logEntry.save();
        console.log(`Saved generated question log ID: ${savedLog._id}, Status: ${logStatus}`);
        if (generationResult.success) {
            // --- MODIFIED RESPONSE TO INCLUDE generatedQuestion ---
            res.status(201).json({
                success: true,
                message: 'Question generated successfully and saved for review.',
                generatedQuestionId: savedLog._id,
                generatedQuestion: { // Include details for frontend preview
                    text: savedLog.generatedQuestionText,
                    options: savedLog.generatedOptions,
                    correctAnswer: savedLog.generatedCorrectAnswer
                }
            });
            // --- END MODIFICATION ---
        } else {
            // Still send 500 on generation/parsing failure, but include logId
            res.status(500).json({
                success: false,
                message: `Failed to generate or parse question. ${generationResult.error || ''}`.trim(),
                logId: savedLog._id
            });
        }
    } catch (dbError) {
        console.error("Failed to save question generation log to DB:", dbError);
        // This error means the AI call might have happened but DB save failed
        res.status(500).json({
            success: false,
            message: 'AI interaction may have occurred, but failed to save the log to the database.',
            error: dbError.message
        });
    }
});

// POST /api/quizzes/:quizId/submit - Handle submission, update leaderboard, log AI accuracy
app.post('/api/quizzes/:quizId/submit', async (req, res) => {
    const { quizId } = req.params;
    const { userAnswers, userId } = req.body;

    // --- Input Validation ---
    if (!userAnswers || typeof userAnswers !== 'object' || Object.keys(userAnswers).length === 0) { return res.status(400).json({ message: 'Valid user answers object is required' }); }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { return res.status(400).json({ message: 'Valid User ID (MongoDB ObjectId) is required' }); }
    if (!quizId || /[\.\/]/.test(quizId)) { return res.status(400).json({ message: 'Invalid quiz ID format' }); }

    let responseMessage = "Score calculated.";

    try {
        // 1. Get Quiz Details
        const quizDetail = await QuizDetail.findOne({ quizId: quizId });
        if (!quizDetail) { return res.status(404).json({ message: `Quiz '${quizId}' not found for submission` }); }
        const questions = quizDetail.questions;
        const totalQuestions = questions.length;

        // 2. Calculate User Score
        let calculatedScore = 0;
        questions.forEach(q => {
            if (userAnswers.hasOwnProperty(q.questionId) && userAnswers[q.questionId] === q.correctAnswer) {
                calculatedScore++;
            }
        });

        // 3. AI Accuracy Check (Run concurrently)
        const accuracyPromises = questions
            .filter(q => userAnswers.hasOwnProperty(q.questionId))
            .map(async (q) => {
                const predictionResult = await getAiPrediction(q.text, q.options, q.correctAnswer);
                const logEntry = new AiAccuracyLog({
                     quizId: quizId,
                     questionId: q.questionId,
                     questionText: q.text,
                     correctAnswer: q.correctAnswer,
                     aiPredictedAnswer: predictionResult.aiPredictedAnswer,
                     isAiCorrect: predictionResult.isAiCorrect,
                     aiResponseRaw: predictionResult.aiResponseRaw,
                     aiModelUsed: predictionResult.aiModelUsed
                });
                try { await logEntry.save(); }
                catch (logError) { console.error(`Failed to save accuracy log for Q:${q.questionId}:`, logError); }
            });
        // Wait for checks only if essential before responding, otherwise let them run
        try { await Promise.all(accuracyPromises); console.log(`AI Accuracy checks completed for quiz ${quizId} by user ${userId}.`); }
        catch(accuracyError) { console.error("Error during AI accuracy check batch:", accuracyError); }

        // 4. Get Username
        let username = "Unknown User";
        try {
            const user = await User.findById(userId).select('username');
            if (user) { username = user.username; }
            else { console.warn(`User ID ${userId} not found during submission.`); }
        } catch (userErr) { console.error(`Error fetching user ${userId} for leaderboard`, userErr); }

        // 5. Update Leaderboard
        const updateData = { userId, username, quizId, totalQuestions, timestamp: new Date() };
        let savedEntry;
        try {
             const existingEntry = await LeaderboardEntry.findOne({ userId: userId, quizId: quizId });
             if (existingEntry) {
                 if (calculatedScore > existingEntry.score) {
                     savedEntry = await LeaderboardEntry.findOneAndUpdate({ _id: existingEntry._id }, { $set: { ...updateData, score: calculatedScore } }, { new: true });
                     responseMessage = "Score calculated. Leaderboard updated with higher score.";
                     console.log(`Leaderboard updated for ${username} on ${quizId}. Score: ${calculatedScore}/${totalQuestions}`);
                 } else {
                     // Optionally update timestamp/username even if score isn't higher
                      savedEntry = await LeaderboardEntry.findOneAndUpdate({ _id: existingEntry._id }, { $set: { username: username, timestamp: new Date() } }, { new: true });
                     responseMessage = "Score calculated. Previous score on leaderboard was higher or equal.";
                 }
             } else {
                 savedEntry = await LeaderboardEntry.create({ ...updateData, score: calculatedScore });
                 responseMessage = "Score calculated. New entry added to leaderboard.";
                 console.log(`New leaderboard entry for ${username} on ${quizId}. Score: ${calculatedScore}/${totalQuestions}`);
             }
        } catch (leaderboardError) {
            console.error(`Error updating leaderboard for user ${userId}, quiz ${quizId}:`, leaderboardError);
            responseMessage = "Score calculated, but failed to update leaderboard.";
        }

        // 6. Respond
        res.json({ quizId: quizId, score: calculatedScore, totalQuestions: totalQuestions, message: responseMessage });

    } catch (err) {
        console.error(`Error processing submission for quiz ${quizId}:`, err);
        if (err.name === 'CastError' && err.path === '_id') { return res.status(400).json({ message: 'Invalid User ID format provided.' }); }
        res.status(500).json({ message: err.message || 'Error processing quiz submission' });
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});