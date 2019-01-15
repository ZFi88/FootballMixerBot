const config = require('./config/config');

const mongoose = require('mongoose');
mongoose.connect(config.connection);

const playerSchema = mongoose.Schema({
    nickName: String,
    name: String,
    skill: Number,
    userId: Number,
    games: Number,
    beer: Number
});

const Player = mongoose.model('Player', playerSchema);

module.exports = {Player};