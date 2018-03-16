class Game {

    constructor() {
        this.goodPlayers = [];
        this.badPlayers = [];
        this.message = {};
    }

    addGoodPlayer(player) {
        if (this.goodPlayers.some(p => p.nickName === player.nickName)) return;
        if (this.badPlayers.some(p => p.nickName === player.nickName)) {
            let start = this.badPlayers.indexOf(p => p.nickName === player.nickName);
            this.badPlayers.splice(start, 1);
        }
        this.goodPlayers.push(player);
    }

    addBadPlayer(player) {
        if (this.badPlayers.some(p => p.nickName === player.nickName)) return;
        if (this.goodPlayers.some(p => p.nickName === player.nickName)) {
            let start = this.goodPlayers.indexOf(p => p.nickName === player.nickName);
            this.goodPlayers.splice(start, 1);
        }
        this.badPlayers.push(player);
    }
}

module.exports = Game;