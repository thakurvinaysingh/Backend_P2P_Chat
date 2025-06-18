// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');

// const { saveChatProcess } = require('./chatLogger');
const chatService = require('./services/chatService');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// ✅ Register REST API routes (only once)
app.use('/api/chat', chatRoutes)

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const users = {};
const roomMembers = {};

// connection database

const mongoose = require('mongoose');
require('dotenv').config(); // If using .env for Mongo URI

mongoose.connect(process.env.MONGODB_URI || 'your-mongodb-atlas-uri', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB connected');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
});
// connection database
io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.id}`);

    socket.on('register', (userId) => {
        users[userId] = socket.id;
        console.log(`👤 Registered: ${userId}`);
    });


    // with multiple connection in room
    // socket.on('join_room', ({ roomId, userId }) => {
    //     socket.join(roomId);
    //     console.log(`📥 ${userId} joined room ${roomId}`);
    // });

    // Join private room (limit 2 users)
    socket.on('join_room', ({ roomId, userId }) => {
        if (!roomMembers[roomId]) {
            roomMembers[roomId] = new Set();
        }
        // Check if user is already in the room
        if (roomMembers[roomId].has(userId)) {
            socket.emit('already_joined');
            console.log(`⚠️ User ${userId} already in room ${roomId}`);
            return;
        }
        const members = roomMembers[roomId];

        if (members.size >= 2 && !members.has(userId)) {
            // Room is full for new user
            socket.emit('room_full', { message: '❌ Room already has 2 users' });
            console.log(`❌ ${userId} blocked from joining full room ${roomId}`);
            return;
        }

        members.add(userId);
        socket.join(roomId);
        console.log(`📥 ${userId} joined room ${roomId}`);
    });


    socket.on('send_message', async ({ roomId, senderId, message, type }) => {
        const msg = { roomId, senderId, message, type };
        io.to(roomId).emit('receive_message', msg);
        // console.log(`📤 ${senderId} to ${roomId}: ${message}`);

        // await saveChatProcess({
        //     txnId: roomId,
        //     buyerUPBAddress: senderId,
        //     sellerUPBAddress : "vinay",
        //     status: "type",
        //     message: message,
        //     msgImg: "vinay", // Optional
        //     upbAddress: "vinay check"
        // });
        // console.log("chekc the msg :",`📤 ${senderId} to ${roomId}: ${message}`);

        try {
            await chatService.saveMessage({ roomId, senderId, message, type });
            console.log(`📤 ${senderId} to ${roomId}: ${message}`);
        } catch (err) {
            console.error('❌ Failed to save chat:', err.message);
        }
    });

        // Step 1: Ask for availability
        socket.on('askAvailability', ({ from, to }) => {
            const toSocketId = users[to];
            if (toSocketId) {
                io.to(toSocketId).emit('receiveAvailabilityRequest', { from });
                console.log(`📨 ${from} asked ${to} for availability`);

            }
            
        });

        // // Step 2: Availability response
        // socket.on('availabilityResponse', ({ from, to, response }) => {
        //     const toSocketId = users[to];
        //     if (toSocketId) {
        //         io.to(toSocketId).emit('receiveAvailabilityResponse', { from, response });
        //         if (response === 'yes') {
        //             console.log(`✅ ${from} is available for ${to}`);
        //         } else {
        //             console.log(`❌ ${from} is not available for ${to}`);
        //         }
        //     }
        // });
    // Server side
    socket.on('availabilityResponse', ({ from, to, response }) => {
        const fromSocketId = users[from];
        const toSocketId = users[to];

        const responsePayload = {
            from,
            response,
        };

        // Emit to both sender and receiver so both see the message
        if (fromSocketId) io.to(fromSocketId).emit('receiveAvailabilityResponse', responsePayload);
        if (toSocketId) io.to(toSocketId).emit('receiveAvailabilityResponse', responsePayload);
    });


        // Step 3: Ask for payment details
        socket.on('askPaymentDetails', ({ from, to }) => {
            const toSocketId = users[to];
            if (toSocketId) {
                io.to(toSocketId).emit('receiveAskForBankDetails', { from });
                console.log(`💰 ${from} asked ${to} for bank details`);
            }
        });

        // Step 4: Send bank details and trigger 5min timer
        socket.on('sendBankDetails', ({ from, to, bankDetails }) => {
            const toSocketId = users[to];
            if (toSocketId) {
                io.to(toSocketId).emit('receiveBankDetails', { from, bankDetails });

                // Notify user1 to start 5 min timer and show "Send Receipt" after 20s
                io.to(toSocketId).emit('startPaymentTimer', { from, duration: 300 }); // 300 seconds
                io.to(toSocketId).emit('showSendReceiptButton', { delay: 20 });

                console.log(`🏦 ${from} sent bank details to ${to}`);
            }
        });

        // Step 5: Send Receipt
        socket.on('sendReceipt', ({ from, to }) => {
            const toSocketId = users[to];
            if (toSocketId) {
                io.to(toSocketId).emit('receivePaymentReceipt', { from, message: 'Payment done' });
                console.log(`🧾 ${from} sent payment receipt to ${to}`);
            }
        });
    
        // Step 6: Payment confirmation by receiver
        // socket.on('confirmPaymentStatus', ({ from, to, status }) => {
        //     const toSocketId = users[to];
        //     if (toSocketId) {
        //         if (status === 'yes') {
        //             io.to(toSocketId).emit('paymentConfirmed', {
        //                 from,
        //                 message: 'Payment done and your order is successfully placed',
        //             });
        //             console.log(`✅ ${from} confirmed payment from ${to}`);
        //         } else {
        //             io.to(toSocketId).emit('paymentConflict', {
        //                 from,
        //                 message: 'Conflict in payment status',
        //             });
        //             io.to(users[from]).emit('paymentConflict', {
        //                 from: to,
        //                 message: 'Conflict in payment status',
        //             });
        //             console.log(`Conflict reported between ${from} and ${to}`);
        //         }
        //     }
        // });

    socket.on('confirmPaymentStatus', ({ from, to, status }) => {
        const toSocketId = users[to];
        const fromSocketId = users[from];

        if (status === 'yes') {
            const payload = {
                from,
                message: '✅ Payment done and your order is successfully placed',
            };

            if (toSocketId) io.to(toSocketId).emit('paymentConfirmed', payload);
            if (fromSocketId) io.to(fromSocketId).emit('paymentConfirmed', payload);

            console.log(`✅ ${from} confirmed payment with ${to}`);
        } else {
            const conflictPayload = {
                from,
                message: '❌ Conflict in payment status',
            };

            if (toSocketId) io.to(toSocketId).emit('paymentConflict', conflictPayload);
            if (fromSocketId) io.to(fromSocketId).emit('paymentConflict', {
                from: to,
                message: '❌ Conflict in payment status',
            });

            console.log(`⚠️ Conflict reported between ${from} and ${to}`);
        }
    });
        
    // socket.on('disconnect', () => {
    //     const user = Object.keys(users).find(u => users[u] === socket.id);
    //     if (user) {
    //         delete users[user];
    //         console.log(`❌ Disconnected: ${user}`);
    //     }
    // });

    socket.on('disconnect', () => {
        const user = Object.keys(users).find(u => users[u] === socket.id);
        if (user) {
            delete users[user];
            console.log(`❌ Disconnected: ${user}`);
            // Remove user from all rooms
            for (const roomId in roomMembers) {
                roomMembers[roomId].delete(user);
            }
        }
    });
});

const PORT = process.env.PORT || 2001;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});



// const express = require('express');
// const http = require('http');
// const socketIO = require('socket.io');
// const cors = require('cors');

// const app = express();
// app.use(cors({
//     origin: ['http://localhost:3000', 'http://192.168.1.27:3001'],
//     methods: ['GET', 'POST'],
//     credentials: true
// }));

// const server = http.createServer(app);
// const io = socketIO(server, {
//     cors: {
//         origin: ['http://192.168.1.27:3001'],
//         methods: ['GET', 'POST'],
//     },
// });

// const users = {};
// const messages = [];

// app.get('/', (req, res) => {
//     res.send('Socket.IO server is running in UPB App');
// });

// app.get('/users', (req, res) => {
//     res.json({
//         connectedUsers: Object.keys(users),
//         messageLog: messages,
//     });
// });

// io.on('connection', (socket) => {
//     console.log(`✅ Socket connected: ${socket.id}`);

//     socket.on('register', (userId) => {
//         for (const uid in users) {
//             if (users[uid] === socket.id) {
//                 delete users[uid];
//             }
//         }
//         users[userId] = socket.id;
//         console.log(`🔐 User registered: ${userId}`);
//         io.emit('userListUpdate', Object.keys(users));
//     });

//     socket.on('sendPrivateMessage', ({ to, message, from }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receivePrivateMessage', { from, message });
//             messages.push({ from, to, message });
//             console.log(`📩 Message from ${from} to ${to}: ${message}`);
//         } else {
//             socket.emit('errorMessage', `User ${to} is not online.`);
//         }
//     });

//     // Step 1: Ask for availability
//     socket.on('askAvailability', ({ from, to }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receiveAvailabilityRequest', { from });
//             console.log(`📨 ${from} asked ${to} for availability`);

//         }
//     });

//     // Step 2: Availability response
//     socket.on('availabilityResponse', ({ from, to, response }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receiveAvailabilityResponse', { from, response });
//             if (response === 'yes') {
//                 console.log(`✅ ${from} is available for ${to}`);
//             } else {
//                 console.log(`❌ ${from} is not available for ${to}`);
//             }
//         }
//     });

//     // Step 3: Ask for payment details
//     socket.on('askPaymentDetails', ({ from, to }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receiveAskForBankDetails', { from });
//             console.log(`💰 ${from} asked ${to} for bank details`);
//         }
//     });

//     // Step 4: Send bank details and trigger 5min timer
//     socket.on('sendBankDetails', ({ from, to, bankDetails }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receiveBankDetails', { from, bankDetails });

//             // Notify user1 to start 5 min timer and show "Send Receipt" after 20s
//             io.to(toSocketId).emit('startPaymentTimer', { from, duration: 300 }); // 300 seconds
//             io.to(toSocketId).emit('showSendReceiptButton', { delay: 20 });

//             console.log(`🏦 ${from} sent bank details to ${to}`);
//         }
//     });

//     // Step 5: Send Receipt
//     socket.on('sendReceipt', ({ from, to }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             io.to(toSocketId).emit('receivePaymentReceipt', { from, message: 'Payment done' });
//             console.log(`🧾 ${from} sent payment receipt to ${to}`);
//         }
//     });

//     // Step 6: Payment confirmation by receiver
//     socket.on('confirmPaymentStatus', ({ from, to, status }) => {
//         const toSocketId = users[to];
//         if (toSocketId) {
//             if (status === 'yes') {
//                 io.to(toSocketId).emit('paymentConfirmed', {
//                     from,
//                     message: 'Payment done and your order is successfully placed',
//                 });
//                 console.log(`✅ ${from} confirmed payment from ${to}`);
//             } else {
//                 io.to(toSocketId).emit('paymentConflict', {
//                     from,
//                     message: 'Conflict in payment status',
//                 });
//                 io.to(users[from]).emit('paymentConflict', {
//                     from: to,
//                     message: 'Conflict in payment status',
//                 });
//                 console.log(`Conflict reported between ${from} and ${to}`);
//             }
//         }
//     });

//     socket.on('disconnect', () => {
//         const disconnectedUser = Object.keys(users).find((userId) => users[userId] === socket.id);
//         if (disconnectedUser) {
//             delete users[disconnectedUser];
//             console.log(` User disconnected: ${disconnectedUser}`);
//             io.emit('userListUpdate', Object.keys(users));
//         }
//     });
// });

// const PORT = process.env.PORT || 2001;
// server.listen(PORT, () => {
//     console.log(`🚀 Server running on http://localhost:${PORT}`);
// });