const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leaderboardEntrySchema = new Schema({
    // Consider referencing the User and Quiz models if needed for complex queries
    // userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    // For simplicity using strings matching your current setup:
    userId: {
        type: String,
        required: true,
        index: true // Index for finding user's scores
    },
    username: { // Store username for quick display
        type: String,
        required: true
    },
    quizId: { // The ID of the quiz (e.g., 'general_knowledge')
        type: String,
        required: true,
        index: true // Index for finding scores for a specific quiz
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for sorting by time
    }
});

// Compound index for common leaderboard queries (optional but good for performance)
leaderboardEntrySchema.index({ quizId: 1, score: -1, timestamp: 1 });
leaderboardEntrySchema.index({ userId: 1, quizId: 1 }, { unique: true }); // Ensure one entry per user per quiz

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema); // Becomes 'leaderboardentries' collection