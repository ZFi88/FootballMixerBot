const config = require('./config/config');

const mongoose = require('mongoose');
mongoose.connect(config.connection);

const playerSchema = mongoose.Schema({
    name: String,
    skill: Number
});

const Player = mongoose.model('Player', playerSchema);

module.exports = {Player};