import {Client, Intents} from "discord.js";

class SpeakerClient {

    constructor(token) {
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
        //  login
        this.client.login(token).then(r => {
            this.enabled = true;
        });
    }

}

module.exports =  SpeakerClient;
