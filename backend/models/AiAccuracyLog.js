// backend/models/AiAccuracyLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aiAccuracyLogSchema = new Schema({
    quizId: { type: String, required: true, index: true },
    questionId: { type: String, required: true },
    questionText: { type: String, required: true }, // Store for context
    correctAnswer: { type: String, required: true }, // Actual correct answer
    aiPredictedAnswer: { type: String, required: false }, // What the AI responded (parsed)
    aiModelUsed: { type: String, default: 'openai/gpt-4o-mini' },
    isAiCorrect: { type: Boolean, required: true },
    aiResponseRaw: { type: String }, // Store the raw response for debugging parsing
    timestamp: { type: Date, default: Date.now, index: true }
});

// Optional compound index if querying by quiz+question often
aiAccuracyLogSchema.index({ quizId: 1, questionId: 1 });

module.exports = mongoose.model('AiAccuracyLog', aiAccuracyLogSchema); // Collection: 'aiaccuracylogs'