class Game {

    constructor() {
        this.players = [];
        this.message = {};
        this.chatId = 0;
    }

    addPlayer(obj) {
        const player = this.players.find(o => o.player.nickName === obj.player.nickName);
        if (player) player.isGood = obj.isGood;
        else this.players.push(obj);
    }

    mix() {

    }
}

module
    .exports = Game;