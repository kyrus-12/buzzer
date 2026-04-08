const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Track who buzzed first
let firstBuzzer = null;
// Track active colors to prevent duplicates (Optional)
let activeColors = new Set();

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // Send current state to the new connection
    if (firstBuzzer) {
        socket.emit('buzzed', firstBuzzer);
    }

    socket.on('buzz', (groupData) => {
        // "One-time buzz" logic: only allow if nobody has buzzed yet
        if (firstBuzzer === null) {
            firstBuzzer = groupData;
            io.emit('buzzed', firstBuzzer); 
            console.log(`🔔 ${groupData.name} buzzed first!`);
        }
    });

    socket.on('reset', () => {
        firstBuzzer = null;
        io.emit('reset-buzzer');
        console.log("♻️ System Reset by Admin");
    });

    socket.on('disconnect', () => {
        // Clean up logic can go here if needed
    });
});

// Render dynamic port logic
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`✅ Server is live on port ${PORT}`);
});
