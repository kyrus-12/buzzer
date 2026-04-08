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
    // If someone joins late and someone already buzzed, show them the winner
    if (firstBuzzer) {
        socket.emit('buzzed', firstBuzzer);
    }

    socket.on('buzz', (groupData) => {
        if (firstBuzzer === null) {
            firstBuzzer = groupData;
            io.emit('buzzed', firstBuzzer); // Broadcast to EVERYONE
        }
    });

    socket.on('reset', () => {
        firstBuzzer = null;
        io.emit('reset-buzzer');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
