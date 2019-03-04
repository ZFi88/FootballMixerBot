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
    if (!canEdit(msg)) {
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
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/edit @(.+) (10|[1-9])/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const nick = match[1];
    const skill = match[2];
    const player = await Player.findOne({nickName: nick});
    if (player) {
        player.skill = skill;
        player.save();
        game.editPlayer(player);
    } else {
        await bot.sendMessage(chatId, `Игрок @${nick} не найден`);
    }
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/editGames @(.+) (\d+) (\d+)/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const nick = match[1];
    const games = match[2];
    const beers = match[3];
    const player = await Player.findOne({nickName: nick});
    if (player) {
        if (games) {
            player.games = games;
        }
        if (beers) {
            player.beer = beers;
        }
        player.save();
        game.editPlayer(player);
    } else {
        await bot.sendMessage(chatId, `Игрок @${nick} не найден`);
    }
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/players/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const players = await Player.find({});
    players.filter(x => !x.games).forEach(x => {
        x.games = 0;
        x.beer = 0;
        x.save();
    });
    players.sort((a, b) => a.games < b.games ? 1 : a.games > b.games ? -1 : 0);
    const message = players.map(p => {
        if (p.name) {
            return `💪${p.skill} ⚽${p.games} 🍺${p.beer} - ${p.name === 'Fedor Zhekov' ? '👑' : ''}<a href=\"tg://user?id=${p.userId}\">${p.name}</a>`;
        } else
            return `${p.skill} ⚽${p.games} 🍺${p.beer} - @${p.nickName}`;
    }).join('\r\n');
    try {
        await bot.sendMessage(chatId, message, {parse_mode: 'HTML'});
    } catch (e) {
        console.log(e);
    }
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/newgame/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    game = new Game();
    game.chatId = chatId;
    const newMsg = await bot.sendMessage(chatId, getMatchMessage(), options);
    game.votingMessage = newMsg;
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.on('callback_query', async (msg) => {
    const chatId = msg.message.chat.id;
    let player = await Player.findOne({userId: msg.from.id});
    if (!player) {
        player = await Player.create({
            nickName: !msg.from.username ? `${msg.from.first_name} ${msg.from.last_name}` : msg.from.username,
            skill: 5
        });
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
        message_id: game.votingMessage.message_id,
        parse_mode: 'Markdown',
        reply_markup: options.reply_markup
    });
});

bot.onText(/\/game/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const newMsg = await bot.sendMessage(chatId, getMatchMessage(), options);
    game.votingMessage = newMsg;
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/mix ([1-4]) (10|[1-9]) (10|[1-9])/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    const teams = game.mix(match[1], match[2], match[3]);
    if (teams.length === 0) {
        await bot.sendMessage(chatId, 'Ошибка! Не могу составить команды!');
        return;
    }
    if (!game.savedState) {
        let goodPlayers = game.getGoodPlayers();
        goodPlayers.forEach(x => {
            if (!x.games) {
                x.games = 1;
            } else {
                x.games++;
            }
            x.save();
        });

        let badPlayers = game.getBadPlayers();
        badPlayers.forEach(x => {
            if (!x.beer) {
                x.beer = 1;
            } else {
                x.beer++;
            }
            x.save();
        });
        game.savedState = true;
    }
    let teamsMessage = getTeamsMessage(teams);
    game.teamsMessage = await bot.sendMessage(chatId, teamsMessage, {parse_mode: 'Markdown'});
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/\/teams/, async (msg, match) => {
    log(msg);
    const chatId = msg.chat.id;
    if (!canEdit(msg)) {
        await bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    let teamsMessage = getTeamsMessage(game.teams);
    game.teamsMessage = await bot.sendMessage(chatId, teamsMessage, {parse_mode: 'Markdown'});
    await bot.deleteMessage(chatId, msg.message_id);
});

bot.onText(/^\/(.+)/gm, async (msg, match) => {
    const chatId = msg.chat.id;
    await bot.deleteMessage(chatId, msg.message_id);
});

function getMatchMessage() {
    const goodPlayersCount = game.players.filter(obj => obj.isGood).length;
    const badPlayersCount = game.players.filter(obj => !obj.isGood).length;

    const gooPlayersList = game.players.filter(obj => obj.isGood).map(obj => ` ⚽️[${obj.player.name}](tg://user?id=${obj.player.userId})`).join('\r\n');
    const badPlayersList = game.players.filter(obj => !obj.isGood).map(obj => ` 🍺 ️[${obj.player.name}](tg://user?id=${obj.player.userId})`).join('\r\n');

    return `⚽ Сегодня новая игра! ⚽\r\n\r\nИдут ${goodPlayersCount}:\r\n${gooPlayersList}\r\nНе идут ${badPlayersCount}:\r\n${badPlayersList}`;
}

function getTeamsMessage(teams) {
    let result = '';
    teams.forEach((t, i) => {
        const teamSkill = t.map(p => p.skill).reduce((a, b) => a + b);
        result += `\r\n⚽ Команда ${i + 1} - 💪(${teamSkill})\r\n`;
        result += t.map(p => `🎮 ️[${p.name}](tg://user?id=${p.userId}) - 💪(${p.skill})`).join('\r\n');
        result += '\r\n';
    });
    return result;
}

const admins = ['AntonOstanin', 'vildarkh', 'zhekovfi'];

function canEdit(msg) {
    return admins.indexOf(msg.from.username) >= 0;
}

process.on('unhandledRejection', async (reason, p) => {
    if (reason.response.body.error_code === 429)
        await bot.sendMessage(game.chatId, 'УГАМАНИТЕСЬ!!!');
});

function log(msg) {
    console.log(`[MESSAGE] - From ${msg.from.username} - \"${msg.text}\". CanEdit - ${canEdit(msg)}`);
}