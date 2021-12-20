const {Client, Intents, Util} = require('discord.js');

class ListenerClient {
    constructor(token, dict) {
        //  dict
        this.dict = dict;
        //  client
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
        //  event
        this.client.on('messageCreate', async msg => this.onMessage(msg));
        this.client.on('voiceStateUpdate', async (oldState, newState) => this.onLeaveVoiceChat(oldState, newState));

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
                    //  TODO Request to connect
                    break;

                //  disconnect
                case 'dc':
                    //  TODO Request to disconnect
                    break;

                //  dictionary
                case 'dict':
                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    switch (args[1]) {
                        case 'add':
                            if (args.length < 4) {
                                msg.channel.send(":boom:エラー:構文が不正です。");
                                break;
                            }
                            //  add
                            this.dict.add(args[2], args[3]);
                            msg.channel.send(`これからは ${args[2]} を ${args[2]} と読みます！`);
                            break;

                        case 'remove':
                            if (args.length < 3) {
                                msg.channel.send(":boom:エラー:構文が不正です。");
                                break;
                            }
                            //  add
                            this.dict.remove(args[2]);
                            msg.channel.send(`${args[2]} を辞書から削除しました`);
                            break;

                        default:
                            msg.channel.send(":boom:エラー:コマンドが不正です。ヘルプで確認してください。^help");
                            break
                    }

                    break;

                //  status
                case 'status':

                    break;

                //  help
                case "help":
                    msg.channel.send({
                        embeds: [{
                            title: ':question: ヘルプ',
                            description:
                                "Command:\n" +
                                "- ^con : 読み上げを開始します\n" +
                                "- ^dc : 切断します\n" +
                                "- ^status : ステータスを表示します\n" +
                                "- ^dict add/remove <A> <B> : AをBと呼ぶ辞書の追加/削除\n" +
                                "- ^help : ヘルプを表示します"
                        }]
                    });
                    break;

                //  other
                default:
                    break;
            }

        }
        //  track message
        else {
            //  Replace a mention to text, Remove Code-Block-Content, and Remove url
            let cleanedMessage = Util.cleanCodeBlockContent(msg.cleanContent).replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
            cleanedMessage = this.dict.replace(cleanedMessage);
        }

    }

    onLeaveVoiceChat(oldState, newState) {
        //  TODO confirm whatever channel is tracked

        //  confirm whatever only bot is in channel
        if (newState.member.length === 1) {
            //  TODO speaker leave implementation
        }
    }
}

module.exports =  ListenerClient;