import {Client, Intents} from "discord.js";

class ListenerClient {
    constructor(token) {
        this.client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
        //  event
        this.client.on('messageCreate', async msg => this.onMessage(msg));

        //  login
        this.client.login(token).then(r => {
            this.enabled = true;
        });
    }

    onMessage(msg) {
        if (this.enabled === false) return; //  is enabled
        if (msg.system || msg.author.bot || msg.author.system) return;  //  is user
        if (msg.content.length < 1) return; //  is empty

        //  prefix
        if (msg.content.startsWith('^')){

        }
        //  track message
        else {

        }

    }

}

export default ListenerClient;