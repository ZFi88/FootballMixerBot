class Game {

    constructor() {
        this.players = [];
        this.votingMessage = {};
        this.teamsMessage = {};
        this.chatId = 0;

        this.teams = [];
    }

    addPlayer(obj) {
        const player = this.players.find(o => o.player.nickName === obj.player.nickName);
        if (player) player.isGood = obj.isGood;
        else this.players.push(obj);
    }

    mix(teamCount, playerTolerance, teamTolerance) {
        if (this.players.length === 0) return [];
        let goodPlayers = this.getGoodPlayers();
        let teams = [];
        let counter = 0;
        while (true) {
            for (let i = 0; i < teamCount; i++) {
                if (teams.length < teamCount) teams.push([]);
                const maxSkill = Math.max(...(goodPlayers.map(y => y.skill)));
                const bestPlayers = goodPlayers.filter(x => Math.abs(x.skill - maxSkill) <= playerTolerance);
                let index = getRandomInt(0, bestPlayers.length - 1);
                teams[i].push(bestPlayers[index]);
                let fff = goodPlayers.indexOf(bestPlayers[index]);
                goodPlayers.splice(fff, 1);
                if (goodPlayers.length === 0)
                    break;
            }

            if (goodPlayers.length === 0) {
                counter++;
                let isRetry = false;
                for (let i = 0; i < teams.length; i++) {
                    for (let j = 0; j < teams.length; j++) {
                        let sum1 = teams[i].map(x => x.skill).reduce((a, b) => a + b);
                        let sum2 = teams[j].map(x => x.skill).reduce((a, b) => a + b);
                        if (Math.abs(sum1 - sum2) > teamTolerance)
                            isRetry = true;
                    }
                }
                if (isRetry) {
                    teams = [];
                    goodPlayers = this.getGoodPlayers();
                }
                else break;
            }
            if (counter > 20) break;
        }

        this.teams = teams;
        return teams;
    }

    getGoodPlayers() {
        return this.players.filter(obj => obj.isGood)
            .map(obj => obj.player);
    }

    editPlayer(player) {
        let p = this.players.find(p => p.player.userId === player.userId);
        if (p) p.player.skill = player.skill;
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = Game;