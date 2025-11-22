const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB (modern syntax - no deprecated options)
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

module.exports = db;
