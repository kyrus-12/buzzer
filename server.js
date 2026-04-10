const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Track current state
let firstBuzzer = null;
let currentActiveQuestion = null; 

// Serve static files from the current directory
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // 1. Sync late-comers with the current buzzer state
    if (firstBuzzer) {
        socket.emit('buzzed', firstBuzzer);
    }

    // 2. Sync late-comers with the active question
    if (currentActiveQuestion) {
        socket.emit('show-question', currentActiveQuestion);
    }

    // Music Sync Logic: Triggered when Admin logs in
    socket.on('admin-logged-in', () => {
        io.emit('start-music'); 
        console.log("🎵 Admin logged in: Triggering music for everyone.");
    });

    // Admin opens a question
    socket.on('open-question', (data) => {
        currentActiveQuestion = data; 
        socket.broadcast.emit('show-question', data);
    });

    // Admin closes a question
    socket.on('close-question', () => {
        currentActiveQuestion = null; 
        socket.broadcast.emit('hide-question');
    });

    // Handle scoring and auto-reset
    socket.on('question-result', (data) => {
        if (data.status === 'correct') {
            io.emit('update-grid', data);
        }
        
        firstBuzzer = null;
        currentActiveQuestion = null; 
        
        // false = reset UI but keep grid history
        io.emit('reset-buzzer', false); 
        io.emit('hide-question'); 
    });

    // Buzzer Logic
    socket.on('buzz', (groupData) => {
        if (firstBuzzer === null) {
            firstBuzzer = groupData;
            io.emit('buzzed', firstBuzzer); 
            console.log(`🔔 ${groupData.name} (${groupData.color}) buzzed first!`);
        }
    });

    // Full System Reset
    socket.on('reset', () => {
        firstBuzzer = null;
        currentActiveQuestion = null;
        io.emit('reset-buzzer', true); 
        io.emit('hide-question'); 
        console.log("♻️ Full System Reset by Admin");
    });
});

// Port configuration for Render or local dev
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
