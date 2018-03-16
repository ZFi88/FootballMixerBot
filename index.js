const config = require('./config/config');

const {Player} = require('./mongoDb');
const TelegramBot = require('node-telegram-bot-api');

const token = config.token;
const bot = new TelegramBot(token, {polling: true});

const Game = require('./game');
let game = new Game();

bot.onText(/\/add @(.+) (10|[1-9])/, async (msg, match) => {
    const chatId = msg.chat.id;
    const sender = msg.from.username;
    const nick = match[1];
    const skill = match[2];
    const player = await Player.findOne({nickName: nick});
    if (player) {
        bot.sendMessage(chatId, `Игрок @${player.nickName} уже добавлен`);
    } else {
        Player.create({nickName: nick, skill: skill});
        bot.sendMessage(chatId, `Добавлен игрок @${nick}`);
    }
});

bot.onText(/\/edit @(.+) (10|[1-9])/, async (msg, match) => {
    const chatId = msg.chat.id;
    const nick = match[1];
    const skill = match[2];
    const player = await Player.findOne({nickName: nick});
    if (player) {
        player.skill = skill;
        player.save();
    } else {
        bot.sendMessage(chatId, `Игрок @${nick} не найден`);
    }
});

bot.onText(/\/allPlayers/, async (msg, match) => {
    const chatId = msg.chat.id;
    const players = await Player.find({});
    bot.sendMessage(chatId, players.map(p => `@${p.nickName} - ${p.skill}`).join('\n'));
});

bot.onText(/\/newMatch/, async (msg, match) => {
    const chatId = msg.chat.id;
    game = new Game();
    const newMsg = await bot.sendMessage(chatId, `Сегодня новая игра!\r\nУчаствуют:\r\n`);
    game.message = newMsg;
    console.log(newMsg);
});

bot.onText(/[д,Д][а,А]/, async (msg, match) => {
    const chatId = msg.chat.id;
    const player = await Player.findOne({nickName: msg.from.username});
    if (!player) {
        bot.sendMessage(chatId, `@${msg.from.username} я Вас не знаю, уговорите администратора добавить Вас.`);
    }
    else {
        if (!game.goodPlayers.some(p => p.nickName === player.nickName)) game.addGoodPlayer(player);
        await bot.editMessageText(getMatchMessage(), {
            chat_id: chatId,
            message_id: game.message.message_id
        });
    }
});

function getMatchMessage() {
    return `Сегодня новая игра!\r\n\r\nИдут ${game.goodPlayers.length}:\r\n${game.goodPlayers.map(p => `@${p.nickName} ⚽️`).join('\r\n')}\r\nНе идут ${game.badPlayers.length}:\r\n${game.badPlayers.map(p => `@${p.nickName} 🎮`).join('\r\n')}`;
}

bot.onText(/[н,Н][е,Е]/, async (msg, match) => {
    const chatId = msg.chat.id;
    const player = await Player.findOne({nickName: msg.from.username});
    if (!player) {
        bot.sendMessage(chatId, `@${msg.from.username} я Вас не знаю, уговорите администратора добавить Вас.`);
    }
    else {
        if (!game.badPlayers.some(p => p.nickName === player.nickName)) game.addBadPlayer(player);
        await bot.editMessageText(getMatchMessage(), {
            chat_id: chatId,
            message_id: game.message.message_id
        });
    }
});

bot.onText(/\/match/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newMsg = await bot.sendMessage(chatId, getMatchMessage());
    game.message = newMsg;
});