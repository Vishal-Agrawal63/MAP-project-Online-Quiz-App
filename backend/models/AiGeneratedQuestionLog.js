// backend/models/AiGeneratedQuestionLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aiGeneratedQuestionLogSchema = new Schema({
    topic: { type: String, required: true, index: true },
    generatedQuestionText: { type: String }, // Might be null if generation/parsing failed
    generatedOptions: { type: [String] }, // Array like ["Option A", "Option B", ...]
    generatedCorrectAnswer: { type: String }, // The text of the correct option
    aiModelUsed: { type: String, required: true },
    rawAiResponse: { type: String }, // For debugging
    status: {
        type: String,
        required: true,
        enum: ['pending_review', 'approved', 'rejected', 'parsing_failed', 'generation_failed'],
        default: 'pending_review',
        index: true
    },
    reviewComments: { type: String }, // Optional feedback from manual review
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AiGeneratedQuestionLog', aiGeneratedQuestionLogSchema); // Collection: 'aigeneratedquestionlogs'