const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Track who buzzed first
let firstBuzzer = null;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // Sync late-comers with the current buzz state
    if (firstBuzzer) {
        socket.emit('buzzed', firstBuzzer);
    }

    // NEW: Tell students to open their modal when Admin opens a question
    socket.on('open-question', (data) => {
        socket.broadcast.emit('show-question', data);
    });

    // NEW: Tell students to close their modal
    socket.on('close-question', () => {
        socket.broadcast.emit('hide-question');
    });

    // NEW: Handle the Check/Wrong scoring
    socket.on('question-result', (data) => {
        if (data.status === 'correct') {
            // Tell everyone to turn that specific box a permanent color
            io.emit('update-grid', data);
        }
        // Auto-reset the buzzer for the next round
        firstBuzzer = null;
        io.emit('reset-buzzer');
    });

    // Handle the Buzzing
    socket.on('buzz', (groupData) => {
        if (firstBuzzer === null) {
            firstBuzzer = groupData;
            io.emit('buzzed', firstBuzzer); // Broadcast to EVERYONE
            console.log(`🔔 ${groupData.name} buzzed first!`);
        }
    });

    // Handle Full System Reset
    socket.on('reset', () => {
        firstBuzzer = null;
        io.emit('reset-buzzer');
        console.log("♻️ System Reset");
    });
});

// Render dynamic port
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
