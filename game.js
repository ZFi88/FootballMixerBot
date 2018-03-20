class Game {

    constructor() {
        this.players = [];
        this.votingMessage = {};
        this.teamsMessage = {};
        this.chatId = 0;
    }

    addPlayer(obj) {
        const player = this.players.find(o => o.player.nickName === obj.player.nickName);
        if (player) player.isGood = obj.isGood;
        else this.players.push(obj);
    }

    mix(teamCount, t) {
        const goodPlayers = this.players.filter(obj => obj.isGood)
            .map(obj => obj.player);
        const teams = [[]];
        while (true) {
            for (let i = 0; i < teamCount; i++) {
                if (teams.length !== teamCount) teams.push([]);
                const maxSkill = Math.max(...(goodPlayers.map(y => y.skill)));
                const bestPlayers = goodPlayers.filter(x => Math.abs(x.skill - maxSkill) <= t);
                let index = getRandomInt(0, bestPlayers.length - 1);
                teams[i].push(bestPlayers[index]);
                let fff = goodPlayers.indexOf(bestPlayers[index]);
                goodPlayers.splice(fff, 1);
                if (goodPlayers.length == 0)
                    break;
            }
            if (goodPlayers.length == 0) break;
        }
        return teams;
    }
}


function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = Game;