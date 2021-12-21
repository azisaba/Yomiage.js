const {Client, Intents} = require('discord.js');

class SpeakerClient {
    static INTERVAL_TIME_MS = 1000;

    constructor(token) {
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});

        //  login
        this.client.login(token).then(r => {
            this.enabled = true;

            //  set interval
            this._timer = setInterval(() => this._intervalCallback(), SpeakerClient.INTERVAL_TIME_MS);
        });
    }

    /**
     * Shutdown client and Clear interval
     */
    shutdown() {
        console.log('shutdown bot...');
        //  disable
        this.enabled = false;
    }

    addMessageQueue() {

    }

    /**
     * Interval callback of reading message
     * @private
     */
    _intervalCallback() {

        //  check shutdown
        if(!this.enabled) {
            //  cancel
            clearInterval(this._timer);
            //  logout
            this.client.destroy();

            console.log('shutdown done.');
        }
        //  TODO read message in voice channel

    }
}

module.exports =  SpeakerClient;
