// backend/User.js


const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// !! IMPORTANT SECURITY WARNING !!
// Storing passwords in plain text is highly insecure.
// Use a library like 'bcrypt' to hash passwords before saving.
// Example: https://www.npmjs.com/package/bcrypt

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Ensure usernames are unique
        trim: true // Remove whitespace
    },
    password: {
        type: String,
        required: true
        // In a real app: Hash this password before saving!
    },
    // You can add more fields like email, creation date, etc.
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Consider adding pre-save hook for password hashing here

module.exports = mongoose.model('User', userSchema); // 'User' becomes 'users' collection