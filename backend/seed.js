// backend/seed.js
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config(); // Load .env variables

require('dotenv').config();
console.log("SEED SCRIPT USING URI:", process.env.MONGODB_URI);

// Import models
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizDetail = require('./models/QuizDetail');
const LeaderboardEntry = require('./models/LeaderboardEntry');

// Data paths
const dataPath = path.join(__dirname, 'data');
const usersFilePath = path.join(dataPath, 'users.json');
const quizzesFilePath = path.join(dataPath, 'quizzes.json');
const quizDetailsPath = path.join(dataPath, 'quizDetails');
const leaderboardPath = path.join(dataPath, 'leaderboard.json');

// Helper to read JSON
async function readJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error);
        return null; // Return null or empty array/object on error
    }
}

async function seedDatabase() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error('Error: MONGODB_URI not found in .env file.');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected.');

        // --- Clear existing data (optional, good for rerunning script) ---
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Quiz.deleteMany({});
        await QuizDetail.deleteMany({});
        await LeaderboardEntry.deleteMany({});
        console.log('Existing data cleared.');

        // --- Seed Users ---
        // !! Remember to HASH passwords if implementing bcrypt !!
        const usersData = await readJson(usersFilePath);
        if (usersData) {
            // You might need to transform user IDs if your frontend expects the old format
            // For now, we let MongoDB generate _id and ignore the old 'id' field
            const usersToInsert = usersData.map(({ id, ...user }) => ({
                 ...user // Spread username, password
                 // Hash password here before insertion in production
            }));
            await User.insertMany(usersToInsert);
            console.log(`${usersToInsert.length} users seeded.`);
        }

        // --- Seed Quizzes (Quiz List) ---
        const quizzesData = await readJson(quizzesFilePath);
        if (quizzesData) {
            const quizzesToInsert = quizzesData.map(q => ({
                quizId: q.id, // Map JSON 'id' to schema's 'quizId'
                title: q.title,
                description: q.description,
                questionCount: q.questionCount
            }));
            await Quiz.insertMany(quizzesToInsert);
            console.log(`${quizzesToInsert.length} quizzes seeded.`);
        }

        // --- Seed Quiz Details (Questions) ---
        const quizDetailFiles = await fs.readdir(quizDetailsPath);
        const quizDetailsToInsert = [];
        for (const file of quizDetailFiles) {
            if (file.endsWith('.json')) {
                const detailData = await readJson(path.join(quizDetailsPath, file));
                if (detailData) {
                    quizDetailsToInsert.push({
                        quizId: detailData.id, // Map JSON 'id' to schema's 'quizId'
                        title: detailData.title,
                        questions: detailData.questions.map(q => ({
                            questionId: q.id, // Map question 'id' to 'questionId'
                            text: q.text,
                            options: q.options,
                            correctAnswer: q.correctAnswer
                        }))
                    });
                }
            }
        }
        if (quizDetailsToInsert.length > 0) {
             await QuizDetail.insertMany(quizDetailsToInsert);
             console.log(`${quizDetailsToInsert.length} quiz details seeded.`);
        }


        // --- Seed Leaderboard ---
        const leaderboardData = await readJson(leaderboardPath);
         if (leaderboardData) {
             // IMPORTANT: You might need to map old user IDs to new MongoDB _ids here
             // This example assumes the userId in leaderboard.json can be used directly.
             // In reality, you'd fetch the corresponding User._id based on username or old id.
             // For simplicity, we insert as is:
             await LeaderboardEntry.insertMany(leaderboardData);
             console.log(`${leaderboardData.length} leaderboard entries seeded (check user IDs).`);
         }


        console.log('Database seeding completed successfully!');

    } catch (error) {
        console.error('Database seeding failed:', error);
    } finally {
        console.log('Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

// Run the seeding function
seedDatabase();