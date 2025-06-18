// models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: String,
    message: String,
    type: { type: String, default: 'text' }, // "text", "image", "status", etc.
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true }, // txnId
    users: [String], // user-1 and user-2
    messages: [messageSchema],
    status: { type: String, default: 'in_progress' }, // "completed" or "in_progress"
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
