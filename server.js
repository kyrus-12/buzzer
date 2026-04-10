const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Increase max payload size for image-heavy exams
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // 10MB
});

// Paths for Data Persistence
const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(QUESTIONS_FILE)) fs.writeFileSync(QUESTIONS_FILE, JSON.stringify([]));
if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, JSON.stringify({}));

// Helper functions to read/write data
const loadData = () => {
    const q = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
    const r = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    return { q, r };
};

const saveData = (questions, results) => {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
};

// Initial state
let { q: questionBank, r: studentResults } = loadData();

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);

    // Sync data immediately
    socket.emit('initData', { questionBank, studentResults });

    // 1. Save Question
    socket.on('saveQuestion', (qData) => {
        questionBank.push(qData);
        saveData(questionBank, studentResults);
        io.emit('updateQuestions', questionBank); 
    });

    // 2. Delete Entire Set
    socket.on('deleteSet', (setName) => {
        questionBank = questionBank.filter(q => q.set !== setName);
        saveData(questionBank, studentResults);
        io.emit('updateQuestions', questionBank);
    });

    // 3. Delete Specific Question
    socket.on('deleteQuestion', (qId) => {
        questionBank = questionBank.filter(q => q.id !== qId);
        saveData(questionBank, studentResults);
        io.emit('updateQuestions', questionBank);
    });

    // 4. Delete Results Folder
    socket.on('deleteResultsFolder', (folderName) => {
        if (studentResults[folderName]) {
            delete studentResults[folderName];
            saveData(questionBank, studentResults);
            io.emit('updateResults', studentResults);
        }
    });

    // 5. Submit Exam
    socket.on('submitExam', (result) => {
        const folder = result.folder;
        
        if (!studentResults[folder]) {
            studentResults[folder] = [];
        }

        const isDuplicate = studentResults[folder].some(r => r.n === result.n);
        
        if (!isDuplicate) {
            studentResults[folder].push(result);
            saveData(questionBank, studentResults);
            io.emit('updateResults', studentResults); 
            console.log(`Submission stored: ${result.n} in ${folder}`);
        } else {
            console.warn(`Duplicate blocked: ${result.n}`);
        }
    });

    socket.on('disconnect', () => console.log('Disconnected'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TEIL Pro Server running at http://localhost:${PORT}`);
});
