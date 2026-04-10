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

// Data storage for TEIL Assessment
let questionBank = [];
let studentResults = {};

// SECURITY: Admin passwords stored server-side only
const MASTER_ADMIN_PASSWORDS = ["1234", "Science7", "AdminAdmin", "Tick2026"];

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

    // 3. Send initial data to TEIL Assessment clients
    socket.emit('initData', {
        questionBank: questionBank,
        studentResults: studentResults
    });

    // --- TEIL ASSESSMENT AUTHENTICATION HANDLERS ---
    
    // Admin authentication
    socket.on('adminAuth', (pass, callback) => {
        const isValid = MASTER_ADMIN_PASSWORDS.includes(pass);
        callback({ success: isValid });
    });
    
    // Verify if password is an admin password (for student login blocking)
    socket.on('verifyExamPass', (pass, callback) => {
        const isAdminPass = MASTER_ADMIN_PASSWORDS.includes(pass);
        callback({ isAdminPass: isAdminPass });
    });

    // Save new question
    socket.on('saveQuestion', (qData) => {
        // Remove existing question with same ID if exists
        questionBank = questionBank.filter(q => q.id !== qData.id);
        questionBank.push(qData);
        io.emit('updateQuestions', questionBank);
        console.log(`📝 Question saved for set: ${qData.set}`);
    });

    // Delete question
    socket.on('deleteQuestion', (id) => {
        questionBank = questionBank.filter(q => q.id !== id);
        io.emit('updateQuestions', questionBank);
        console.log(`🗑️ Question deleted: ${id}`);
    });

    // Submit exam results
    socket.on('submitExam', (data) => {
        const folder = data.folder;
        if (!studentResults[folder]) {
            studentResults[folder] = [];
        }
        studentResults[folder].push(data);
        io.emit('updateResults', studentResults);
        console.log(`📊 Exam submitted: ${data.n} - ${data.sp}`);
    });

    // --- MUSIC SYNC LOGIC ---
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
        
        io.emit('reset-buzzer', false); 
        io.emit('hide-question'); 
    });

    // Updated buzz handler
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

const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
