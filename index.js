const config = require('./config/config');

const {Player} = require('./mongoDb');
const TelegramBot = require('node-telegram-bot-api');

const token = config.token;
const bot = new TelegramBot(token, {polling: true});

const Game = require('./game');
let game = new Game();

const options = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{text: 'Иду', callback_data: 'yes'}, {text: 'Не иду', callback_data: 'no'}]
        ]
    })
};

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
        await bot.sendMessage(chatId, `Добавлен игрок @${nick}`);
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
        await bot.sendMessage(chatId, `Игрок @${nick} не найден`);
    }
});

bot.onText(/\/allPlayers/, async (msg, match) => {
    const chatId = msg.chat.id;
    const players = await Player.find({});
    await bot.sendMessage(chatId, players.map(p => `@${p.nickName} - ${p.skill}`).join('\n'));
});

bot.onText(/\/newMatch/, async (msg, match) => {
    const chatId = msg.chat.id;
    game = new Game();


    const newMsg = await bot.sendMessage(chatId, `Сегодня новая игра!\r\nУчаствуют:\r\n`, options);
    game.message = newMsg;
    console.log(newMsg);
});

bot.on('callback_query', async (msg) => {
    const chatId = msg.message.chat.id;
    const player = await Player.findOne({nickName: msg.from.username});
    if (!player) {
        await bot.sendMessage(chatId, `@${msg.from.username} я Вас не знаю, уговорите администратора добавить Вас.`);
        return;
    }
    switch (msg.data) {
        case 'yes':
            if (!game.goodPlayers.some(p => p.nickName === player.nickName)) game.addGoodPlayer(player);
            else return;
            break;
        case 'no':
            if (!game.badPlayers.some(p => p.nickName === player.nickName)) game.addBadPlayer(player);
            else return;
            break;
    }
    await bot.editMessageText(getMatchMessage(), {
        chat_id: chatId,
        message_id: game.message.message_id
    });
    await bot.editMessageReplyMarkup(options.reply_markup, {chat_id: chatId, message_id: game.message.message_id});
});

bot.onText(/\/match/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newMsg = await bot.sendMessage(chatId, getMatchMessage(), options);
    game.message = newMsg;
});

function getMatchMessage() {
    return `Сегодня новая игра!\r\n\r\nИдут ${game.goodPlayers.length}:\r\n${game.goodPlayers.map(p => `@${p.nickName} ⚽️`).join('\r\n')}\r\nНе идут ${game.badPlayers.length}:\r\n${game.badPlayers.map(p => `@${p.nickName} 🎮`).join('\r\n')}`;
}