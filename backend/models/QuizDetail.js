const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema for questions within a QuizDetail
const questionSchema = new Schema({
    questionId: { // Renamed from 'id' to avoid confusion
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    options: {
        type: [String], // Array of strings
        required: true
    },
    correctAnswer: {
        type: String,
        required: true
    }
}, { _id: false }); // Disable automatic _id for subdocuments if not needed

const quizDetailSchema = new Schema({
    quizId: { // Use the same ID as the corresponding Quiz document
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: { // Often helpful to store title here too
        type: String,
        required: true
    },
    questions: [questionSchema] // Array of question subdocuments
});

module.exports = mongoose.model('QuizDetail', quizDetailSchema); // Becomes 'quizdetails' collection