const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Track current state
let firstBuzzer = null;
let currentActiveQuestion = null; // Track if a question is currently live

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // 1. Sync late-comers with the current buzzer state
    if (firstBuzzer) {
        socket.emit('buzzed', firstBuzzer);
    }

    // 2. Sync late-comers with the active question (So it doesn't disappear on refresh)
    if (currentActiveQuestion) {
        socket.emit('show-question', currentActiveQuestion);
    }

    // --- ADD THE MUSIC SYNC LOGIC HERE ---
    socket.on('admin-logged-in', () => {
        // This sends the 'start-music' command to EVERYONE connected
        io.emit('start-music'); 
        console.log("🎵 Admin logged in: Triggering music for everyone.");
    });

    // Admin opens a question
    socket.on('open-question', (data) => {
        currentActiveQuestion = data; // Store the state
        socket.broadcast.emit('show-question', data);
    });

    // Admin closes a question
    socket.on('close-question', () => {
        currentActiveQuestion = null; // Clear the state
        socket.broadcast.emit('hide-question');
    });

    // Handle scoring and auto-reset
    socket.on('question-result', (data) => {
        if (data.status === 'correct') {
            // Update grid for everyone (permanent color change)
            io.emit('update-grid', data);
        }
        
        // Reset state for the next round
        firstBuzzer = null;
        currentActiveQuestion = null; 
        io.emit('reset-buzzer');
    });

    // Handle the Buzzing
    socket.on('buzz', (groupData) => {
        // Only allow buzz if no one has buzzed yet
        if (firstBuzzer === null) {
            firstBuzzer = groupData;
            io.emit('buzzed', firstBuzzer); 
            console.log(`🔔 ${groupData.name} buzzed first!`);
        }
    });

    // Full System Reset
    socket.on('reset', () => {
    firstBuzzer = null;
    currentActiveQuestion = null;
    // Add 'true' here to signal a FULL reset
    io.emit('reset-buzzer', true); 
    io.emit('hide-question'); 
    console.log("♻️ Full System Reset by Admin");
});
});

// Prepared and modified by John Renz I. Vertudazo
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
