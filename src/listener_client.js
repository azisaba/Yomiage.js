import {Client, Intents, Util} from "discord.js";

class ListenerClient {
    constructor(token) {
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
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
        if (msg.content.startsWith('^')) {
            //  remove prefix and split content
            const args = msg.content.slice(1).split(' ');
            //  safety
            if (args.length < 1) return;

            switch (args[0]) {
                //  connect
                case 'con':

                    break

                //  disconnect
                case 'dc':

                    break

                //  dictionary
                case 'dict':

                    break

                //  status
                case 'status':

                    break

                //  help
                case "help":

                    break

                //  other
                default:
                    break
            }

        }
        //  track message
        else {
            //  Replace a mention to text, Remove Code-Block-Content, and Remove url
            let cleanedMessage = Util.cleanCodeBlockContent(msg.cleanContent).replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');

        }

    }

}

module.exports =  ListenerClient;