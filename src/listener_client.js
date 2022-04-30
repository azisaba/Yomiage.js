/**
 * @fileOverview Class of Listener client.
 * @author testusuke
 */

const {Client, Intents, Util} = require('discord.js');
const Config = require('./config');

class ListenerClient {
    constructor(token, dict, client_manager) {
        //  dict
        this.dict = dict;
        //  client manager
        this.client_manager = client_manager;
        //  client
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]});
        //  event
        //this.client.on('messageCreate', async msg => this.onMessage(msg));
        this.client.on('raw', async e => {
            if (e.t !== 'MESSAGE_CREATE') return;
            const guild = await this.client.guilds.fetch(e.d.guild_id);
            const channel = await this.client.channels.fetch(e.d.channel_id);
            let member;
            try {
                member = await guild.members.fetch(e.d.author.id)
            } catch (e) {
                return;
            }
            if (!channel.send) {
                channel.send = () => {};
            }
            this.onMessage({
                ...e.d,
                cleanContent: Util.cleanContent(e.d.content, channel),
                system: (e.d.flags || 0) & 16 === 16,
                guild,
                channel,
                member,
            });
        });
        this.client.on('voiceStateUpdate', async (oldState, newState) => this.onLeaveVC(oldState, newState));

        //  cached-config
        const cacheReload = () => {
            this.cached_config = Config.getConfig();
            if (this.cached_config['specific-bot'] === undefined) {
                this.cached_config['specific-bot'] = [];
            }
            if (this.cached_config['mute-user'] === undefined) {
                this.cached_config['mute-user'] = [];
            }
        }
        //  init
        cacheReload();
        setInterval(() => {
            cacheReload();
        }, 30 * 1000);

        //  login
        this.client.login(token).then(() => {
            this.enabled = true;

            console.log(`Listener Client is Online! id: ${this.client.user.id}`);
        });
    }

    async onMessage(msg) {
        if (this.enabled === false) return; //  is enabled
        if (msg.system || msg.author.system) return;  //  is system
        if (msg.author.bot && !this.cached_config['specific-bot'].includes(msg.author.id)) return; //  is bot
        if (msg.content.length < 1) return; //  is empty
        if (this.cached_config['mute-user'].includes(msg.author.id)) return;   //  mute user

        //  prefix
        if (msg.content.startsWith('^')) {
            //  check permission
            if (!msg.guild.me.permissionsIn(msg.channel).has("SEND_MESSAGES")) return;

            //  remove prefix and split content
            const args = msg.content.slice(1).split(' ');
            //  safety
            if (args.length < 1) return;

            main: switch (args[0]) {
                //  connect
                case 'con': {
                    //  does user connect to vc
                    if(msg.channel.nsfw) {
                        msg.channel.send(":boom:エラー:NSFW(年齢制限)チャンネルは読み上げることができません。")
                        break;
                    }

                    const member = await msg.member.fetch();
                    if (member.voice.channel === null) {
                        msg.channel.send(":boom:エラー:VCに接続してください。");
                        break;
                    }

                    const voice_channel = await member.voice.channel.fetch();
                    for (const bot of this.client_manager.speakers) {
                        if (await bot.isTracked(msg.channel.id)) {
                            msg.channel.send(":boom:エラー:このチャンネルはすでに登録されています。");
                            break main;
                        }

                        if (await bot.isTracked(voice_channel.id)) {
                            msg.channel.send(":boom:エラー:このVCはすでに接続されています。");
                            break main;
                        }
                    }

                    //  connect
                    const bot = this.client_manager.speakers.find(client => client.isConnectable(msg.guild.id));
                    if (bot === undefined) {
                        msg.channel.send(":boom:エラー:現在参加可能なBotがありません。");
                        break;
                    }
                    //  request
                    bot.connect(msg.channel, voice_channel).then(resolve => {
                        if (resolve === true) {
                            msg.channel.send("読み上げを開始します。");
                        } else {
                            msg.channel.send(":boom:エラー:接続に失敗しました。");
                        }
                    })
                    break;
                }
                //  disconnect
                case 'dc': {
                    for (const bot of this.client_manager.speakers) {
                        // is track text channel
                        if (await bot.isTracked(msg.channel.id)) {
                            //  disconnect
                            msg.channel.send("切断します。");
                            await bot.disconnect(msg.guild.id).then(resolve => {
                                if (resolve === false) {
                                    msg.channel.send(":boom:エラー:切断に失敗しました。");
                                }
                            });
                            break main;
                        }
                    }

                    //  nothing
                    msg.channel.send(":boom:エラー:このチャンネルは登録されていません。");

                    break;
                }

                //  dictionary
                case 'dict': {
                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    const cleanedArgs = msg.cleanContent.slice(1).split(' ');
                    switch (args[1]) {
                        case 'add': {
                            if (args.length < 4) {
                                msg.channel.send(":boom:エラー:構文が不正です。");
                                break;
                            }
                            //  add
                            this.dict.add(cleanedArgs[2], cleanedArgs[3]);
                            msg.channel.send(`これからは ${cleanedArgs[2]} を ${cleanedArgs[3]} と読みます！`);
                            break;
                        }
                        case 'remove': {
                            if (args.length < 3) {
                                msg.channel.send(":boom:エラー:構文が不正です。");
                                break;
                            }
                            //  remove
                            if (this.dict.remove(cleanedArgs[2])) {
                                msg.channel.send(`${cleanedArgs[2]} を辞書から削除しました`);
                            } else {
                                msg.channel.send(":boom:エラー:そのような単語はありません");
                            }

                            break;
                        }

                        case 'list': {
                            //  page
                            const page = args.length < 3 ? 1 : Number(args[2]);
                            const words_per_page = 20;
                            //  page is positive number
                            if (Number.isNaN(page) || page < 0 || !Number.isInteger(page)) {
                                msg.channel.send(":boom:エラー:1以上の整数で指定してください。");
                                break;
                            }

                            const dictionary = this.dict.map();
                            const keys = Object.keys(dictionary);
                            //  limit checker
                            if (words_per_page * (page - 1) >= keys.length) {

                                msg.channel.send(`:boom:エラー:${Math.ceil(keys.length / words_per_page)}ページまでです。(単語数: ${keys.length})`);
                                break;
                            }

                            let message = '';
                            keys.forEach((word, index) => {
                                if (index >= words_per_page * (page - 1)) {
                                    if (index >= words_per_page * page) return;
                                    //  insert
                                    message += `${index}: ${word} => ${dictionary[word]}\n`;
                                }
                            });

                            const embed = {
                                embeds: [
                                    {
                                        title: `辞書一覧 ${page}ページ目`,
                                        description: message
                                    }
                                ]
                            }
                            msg.channel.send(embed);
                            break;
                        }

                        default: {
                            msg.channel.send(":boom:エラー:コマンドが不正です。ヘルプで確認してください。^help");
                            break;
                        }
                    }

                    break;
                }

                //  status
                case 'status': {
                    const bots = this.client_manager.speakers.filter(speaker => speaker.isAccessible(msg.guildId));
                    //  cannot find bot
                    if (bots.length <= 0) {
                        msg.channel.send(":boom:エラー:利用可能なBotがありません。");
                        break;
                    }

                    let message = '';
                    bots.forEach(bot => {
                        const status = (bot.isConnectable(msg.guildId) ? ":white_check_mark: 利用可能" : ":hot_face: 使用中");
                        message += `${bot.client.user.username} -> ${status}\n`;
                    });
                    //  build
                    const embed = {
                        embeds: [
                            {
                                title: '稼働状況',
                                description: message
                            }
                        ]
                    };

                    msg.channel.send(embed);
                    break;
                }

                //  setting
                case "setting": {
                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }
                    switch (args[1]) {
                        case "speed": {
                            const speed = args.length < 3 ? undefined : Number.parseFloat(args[2]);
                            if (Number.isNaN(speed) || speed < 0.25 || speed > 4.0) {
                                msg.channel.send(":boom:エラー:0.25以上4未満の浮動小数点数で指定してください。");
                                break;
                            }

                            //  get client
                            for (const bot of this.client_manager.speakers) {
                                if (await bot.isTracked(msg.channel.id)) {
                                    bot.setSpeakingRate(msg.guildId, speed);
                                    msg.channel.send(`読み上げ速度を${speed}に変更しました。`);
                                    break main;
                                }
                            }
                            msg.channel.send(":boom:エラー:このチャンネルは登録されていません。");
                            break;
                        }

                        default: {
                            msg.channel.send(":boom:エラー:コマンドが不正です。ヘルプで確認してください。^help");
                            break;
                        }
                    }
                    break;
                }

                //  skip
                case "skip": {
                    //  does user connect to vc
                    const member = await msg.member.fetch();
                    if (member.voice.channel === null) {
                        msg.channel.send(":boom:エラー:VCに接続してください。");
                        break;
                    }
                    const voice_channel = await member.voice.channel.fetch();
                    for (const bot of this.client_manager.speakers) {
                        if (await bot.isTracked(voice_channel.id)) {
                            msg.channel.send("現在読み上げられているメッセージをスキップします。");
                            //  skip request
                            bot.skipText(voice_channel.id);
                            break main;
                        }
                    }
                    break;
                }

                //  add specific bot
                case "addrule": {
                    //  permission
                    if (!await this.hasPermission(msg.member, 'yomiage-mod')) {
                        msg.channel.send(":boom:エラー:権限がありません。");
                        return;
                    }
                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    const regexId =　args[1].match(/<@!(\d+)>/);
                    if (regexId === null || regexId.length < 2) {
                        msg.channel.send(":boom:エラー:使い方が間違っています。^help");
                        break;
                    }
                    const id = regexId[1];

                    let config = Config.getConfig();
                    if (config['specific-bot'] === undefined) {
                        config['specific-bot'] = [];
                    } else if (config['specific-bot'].includes(id)) {
                        msg.channel.send(":boom:エラー:すでに登録されています。");
                        break;
                    }
                    //  insert config
                    config['specific-bot'].push(id);
                    Config.save(config);

                    msg.channel.send(`${regexId[0]}を読み上げ対象にしました。`);
                    break;
                }

                //  add specific bot
                case "deleterule": {
                    //  permission
                    if (!await this.hasPermission(msg.member, 'yomiage-mod')) {
                        msg.channel.send(":boom:エラー:権限がありません。");
                        return;
                    }

                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    const regexId =　args[1].match(/<@!(\d+)>/);
                    if (regexId === null || regexId.length < 2) {
                        msg.channel.send(":boom:エラー:使い方が間違っています。^help");
                        break;
                    }
                    const id = regexId[1];

                    let config = Config.getConfig();
                    if (config['specific-bot'] === undefined) {
                        msg.channel.send(":boom:エラー:登録されていません。");
                        break
                    }
                    if (!config['specific-bot'].includes(id)) {
                        msg.channel.send(":boom:エラー:登録されていません。");
                        break;
                    }

                    //  delete config
                    const index = config['specific-bot'].indexOf(id);
                    if (index > -1) {
                        config['specific-bot'].splice(index, 1);
                    }
                    Config.save(config);

                    msg.channel.send(`${regexId[0]}を読み上げ対象から除外しました。`);
                    break;
                }

                //  mute user
                case "mute": {
                    //  permission
                    if (!await this.hasPermission(msg.member, 'yomiage-mod')) {
                        msg.channel.send(":boom:エラー:権限がありません。");
                        return;
                    }
                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    const id = args[1];
                    if (msg.guild.members.cache.find(user => user.id === id) === undefined) {
                        msg.channel.send(":boom:エラー:ユーザIDが不正です");
                        break;
                    }

                    let config = Config.getConfig();
                    if (config['mute-user'] === undefined) {
                        config['mute-user'] = [];
                    } else if (config['mute-user'].includes(id)) {
                        msg.channel.send(":boom:エラー:すでに登録されています。");
                        break;
                    }
                    //  insert config
                    config['mute-user'].push(id);
                    Config.save(config);

                    msg.channel.send(`${id}をmuteしました`);
                    break;
                }

                //  unmute user
                case "unmute": {
                    //  permission
                    if (!await this.hasPermission(msg.member, 'yomiage-mod')) {
                        msg.channel.send(":boom:エラー:権限がありません。");
                        return;
                    }

                    //  length
                    if (args.length < 2) {
                        msg.channel.send(":boom:エラー:構文が不正です。");
                        break;
                    }

                    const id = args[1];
                    if (msg.guild.members.cache.find(user => user.id === id) === undefined) {
                        msg.channel.send(":boom:エラー:ユーザIDが不正です");
                        break;
                    }

                    let config = Config.getConfig();
                    if (config['mute-user'] === undefined) {
                        msg.channel.send(":boom:エラー:登録されていません。");
                        break
                    }
                    if (!config['mute-user'].includes(id)) {
                        msg.channel.send(":boom:エラー:登録されていません。");
                        break;
                    }

                    //  delete config
                    const index = config['mute-user'].indexOf(id);
                    if (index > -1) {
                        config['mute-user'].splice(index, 1);
                    }
                    Config.save(config);

                    msg.channel.send(`${id}をmute解除しました。`);
                    break;
                }

                //  help
                case "help": {
                    const embed = {
                        embeds: [
                            {
                                title: ':question: ヘルプ',
                                description:
                                    "Command:\n" +
                                    "- ^con : 読み上げを開始します\n" +
                                    "- ^dc : 切断します\n" +
                                    "- ^status : ステータスを表示します\n" +
                                    "- ^dict add/remove <A> <B> : AをBと呼ぶ辞書の追加/削除\n" +
                                    "- ^dict list <number> : 辞書一覧を表示します\n" +
                                    "- ^setting speed <Value> : 読み上げるスピードを変更します\n" +
                                    "- ^skip : 読み上げをスキップします\n" +
                                    "- ^addrule @mention : 指定したBotを読み上げ対象にします\n" +
                                    "- ^deleterule @mention : 指定したBotを読み上げ対象から除外します\n" +
                                    "- ^mute <id> : muteします\n" +
                                    "- ^unmute <id> : mute解除します\n" +
                                    "- ^help : ヘルプを表示します"
                            }
                        ]
                    }

                    msg.channel.send(embed);
                    break;
                }

                //  other
                default:
                    break;
            }

        }
        //  track message
        else {
            const channel = msg.channel;

            for (const bot of this.client_manager.speakers) {
                if (!await bot.isTracked(channel.id)) continue;

                //  Replace a mention to text, Remove Code-Block-Content
                let cleanedMessage = Util.cleanCodeBlockContent(msg.cleanContent);
                //  remove url
                cleanedMessage = cleanedMessage.replaceAll(/(?:https?|ftp):\/\/[\n\S]+/g, '');
                //  remove code block
                cleanedMessage = cleanedMessage.replaceAll(/``(.*?)[\\n ]?([^]+?)``/g, '').replaceAll("`", '');
                //  remove invisible message
                cleanedMessage = cleanedMessage.replaceAll(/\|\|(.*?)[\n ]?([^]+?)\|\|/g, '');
                //  remove special emoji
                cleanedMessage = cleanedMessage.replaceAll(/<a?:([a-zA-Z0-9_\-]+):\d+>/g, '$1');
                //  dict
                cleanedMessage = this.dict.replace(cleanedMessage);

                //  build message
                const vc_id = bot.getVoiceChannelId(channel.id);
                if (vc_id === undefined) continue;

                const message = {
                    'guild': msg.guild.id,
                    'channel': vc_id,
                    'message': cleanedMessage
                };

                //  push
                bot.addMessage(message);
                break;
            }

        }

    }

    async hasPermission(member, name) {
        const fetched = await member.fetch()
        return fetched.roles.cache.some(role => role.name === name)
    }

    async onLeaveVC(oldState, newState) {
        try {
            if (oldState.channel === null && newState.channel !== null) {
                return;
            }

            //  exception
            if (oldState.channel === null) return;

            const vc = await oldState.channel.fetch();
            const users = vc.members.filter(member => member.user.bot === false);

            if (users.size <= 0 && vc.members.size > 0) {
                for (const bot of this.client_manager.speakers) {
                    //  channel is tracked
                    if (await bot.isTracked(oldState.channel.id)) {
                        bot.disconnect(oldState.guild.id);
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }
}

module.exports = ListenerClient;
