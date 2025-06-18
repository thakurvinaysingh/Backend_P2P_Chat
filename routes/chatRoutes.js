// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

router.get('/user/:userId', async (req, res) => {
    const chats = await chatService.getUserChats(req.params.userId);
    res.json(chats);
});

router.get('/room/:roomId', async (req, res) => {
    const chat = await chatService.getChatByRoom(req.params.roomId);
    res.json(chat);
});

router.post('/complete/:roomId', async (req, res) => {
    const chat = await chatService.markChatAsCompleted(req.params.roomId);
    res.json(chat);
});

module.exports = router;
