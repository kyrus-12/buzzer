const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// State Management
let buzzedUser = null; // Tracks who buzzed first
let currentQuestion = null;

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. Admin logs in - trigger music for everyone if desired
    socket.on('admin-logged-in', () => {
        socket.broadcast.emit('start-music');
    });

    // 2. Admin opens a question
    socket.on('open-question', (data) => {
        currentQuestion = data;
        buzzedUser = null; // Clear any previous buzzer for the new question
        io.emit('show-question', data);
        io.emit('reset-buzzer', false); // Reset the visual "Buzzed" state on clients
    });

    // 3. Student hits the Buzzer
    socket.on('buzz', (userData) => {
        // Only the first buzz is recorded
        if (!buzzedUser) {
            buzzedUser = userData;
            console.log(`${userData.name} buzzed first!`);
            io.emit('buzzed', buzzedUser); // Tell everyone who won the race
        }
    });

    // 4. Admin marks answer as Correct or Wrong
    socket.on('question-result', (result) => {
        if (result.status === 'correct') {
            // Update the grid for everyone to show the question is solved
            io.emit('update-grid', { 
                id: result.id, 
                color: result.color 
            });
        }
        
        // Reset the buzzer lock for the next attempt or next question
        buzzedUser = null;
        io.emit('reset-buzzer', false);
    });

    // 5. Admin closes question without result
    socket.on('close-question', () => {
        currentQuestion = null;
        buzzedUser = null;
        io.emit('hide-question');
        io.emit('reset-buzzer', false);
    });

    // 6. Full System Reset
    socket.on('reset', () => {
        buzzedUser = null;
        currentQuestion = null;
        io.emit('reset-buzzer', true); // 'true' triggers the grid clear in your HTML
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
