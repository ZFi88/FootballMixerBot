const config = require('./config/config');

const {Player} = require('./mongoDb');
const TelegramBot = require('node-telegram-bot-api');

const token = config.token;
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    // bot.sendMessage(chatId, `Received your message - ${msg.text}`);
});

bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match[1].split(' ');
    Player.create({name: resp[0], skill: resp[1]});
    bot.sendMessage(chatId, `Добавлен игрок ${resp[0]}`);
});

bot.onText(/\/allPlayers/, async (msg, match) => {
    const chatId = msg.chat.id;
    const players = await Player.find({});
    bot.sendMessage(chatId, players.map(p => `${p.name} - ${p.skill}`).join('\n'));
});