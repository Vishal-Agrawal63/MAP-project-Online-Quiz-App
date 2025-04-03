const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const quizSchema = new Schema({
    // Use MongoDB's default _id or keep your custom 'id' if needed for linking
    quizId: { // Renamed from 'id' to avoid confusion with Mongo's _id
        type: String,
        required: true,
        unique: true,
        index: true // Add index for faster lookups
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    questionCount: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Quiz', quizSchema); // 'Quiz' becomes 'quizzes' collection