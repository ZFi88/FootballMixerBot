const config = require('./config/config');

const {Player} = require('./mongoDb');
const TelegramBot = require('node-telegram-bot-api');

const token = config.token;
const bot = new TelegramBot(token, {polling: true});

const Game = require('./game');
let game = new Game();

const options = {
    parse_mode: 'Markdown',
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{text: 'Иду', callback_data: 'yes'}, {text: 'Не иду', callback_data: 'no'}]
        ]
    })
};

bot.onText(/\/add @(.+) (10|[1-9])/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!checkUser(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
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
    log(msg);
    const chatId = msg.chat.id;
    if (!checkUser(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
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

bot.onText(/\/players/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!checkUser(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const players = await Player.find({});
    await bot.sendMessage(chatId, players.map(p => `${p.name ? `[${p.name}](tg://user?id=${p.userId})` : `@${p.nickName}`} - ${p.skill}`).join('\n'), {parse_mode: 'Markdown'});
});

bot.onText(/\/newgame/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!checkUser(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    game = new Game();
    game.chatId = chatId;
    const newMsg = await bot.sendMessage(chatId, getMatchMessage(), options);
    game.message = newMsg;
});

bot.on('callback_query', async (msg) => {
    const chatId = msg.message.chat.id;
    const player = await Player.findOne({nickName: msg.from.username});
    if (!player) {
        await bot.sendMessage(chatId, `@${msg.from.username} я Вас не знаю, уговорите администратора добавить Вас.`);
        return;
    }
    if (!player.name || !player.userId) {
        player.name = `${msg.from.first_name} ${msg.from.last_name}`;
        player.userId = msg.from.id;
        await player.save();
    }
    switch (msg.data) {
        case 'yes':
            game.addPlayer({player, isGood: true});
            break;
        case 'no':
            game.addPlayer({player, isGood: false});
            break;
    }
    await bot.editMessageText(getMatchMessage(), {
        chat_id: chatId,
        message_id: game.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: options.reply_markup
    });
});

bot.onText(/\/game/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!checkUser(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const newMsg = await bot.sendMessage(chatId, getMatchMessage(), options);
    game.message = newMsg;
});

function getMatchMessage() {
    const goodPlayersCount = game.players.filter(obj => obj.isGood).length;
    const badPlayersCount = game.players.filter(obj => !obj.isGood).length;

    const gooPlayersList = game.players.filter(obj => obj.isGood).map(obj => ` ⚽️[${obj.player.name}](tg://user?id=${obj.player.userId})`).join('\r\n');
    const badPlayersList = game.players.filter(obj => !obj.isGood).map(obj => ` 🍺 ️[${obj.player.name}](tg://user?id=${obj.player.userId})`).join('\r\n');

    return `⚽ Сегодня новая игра! ⚽\r\n\r\nИдут ${goodPlayersCount}:\r\n${gooPlayersList}\r\nНе идут ${badPlayersCount}:\r\n${badPlayersList}`;
}

const admins = ['AntonOstanin', 'vildarkh', 'zhekovfi'];

function checkUser(msg) {
    return admins.indexOf(msg.from.username) >= 0;
}

process.on('unhandledRejection', async (reason, p) => {
    if (reason.response.body.error_code === 429)
        await bot.sendMessage(game.chatId, 'УГАМАНИТЕСЬ!!!');
});

function log(msg){
    console.log(`[MESSAGE] - From ${msg.from.username} - \"${msg.text}\"`);
}