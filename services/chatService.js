// services/chatService.js
const Chat = require('../models/Chat');

const saveMessage = async ({ roomId, senderId, message, type }) => {
    let chat = await Chat.findOne({ roomId });

    if (!chat) {
        chat = new Chat({
            roomId,
            users: [senderId], // Add more intelligently if needed
            messages: []
        });
    }

    // Update users if sender not in chat
    if (!chat.users.includes(senderId)) {
        chat.users.push(senderId);
    }

    chat.messages.push({ senderId, message, type });
    chat.updatedAt = new Date();
    await chat.save();
};

const getChatByRoom = async (roomId) => {
    return await Chat.findOne({ roomId });
};

const markChatAsCompleted = async (roomId) => {
    return await Chat.findOneAndUpdate({ roomId }, { status: 'completed' }, { new: true });
};

const getUserChats = async (userId) => {
    return await Chat.find({ users: userId });
};

module.exports = {
    saveMessage,
    getChatByRoom,
    markChatAsCompleted,
    getUserChats
};
