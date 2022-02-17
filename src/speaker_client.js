/**
 * @fileOverview Class of Speaker client.
 * @author testusuke
 */

const {Client, Intents} = require('discord.js');
const {joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionReadyState,
    getVoiceConnection,
    NoSubscriberBehavior,
    AudioPlayerIdleState
} = require('@discordjs/voice');
// const YomiageMessage = require('./yomiage_message.js');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
// const util = require('util');

class SpeakerClient {
    static INTERVAL_TIME_MS = 1000;
    static SPEAKER_STATUS = {
        IDLE: 0,
        JOINED: 1
    };

    constructor(token, data_directory) {
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
        this._data_directory = data_directory;
        //  init message queue
        this.messages = [];

        //  init google client
        this._google_client = new textToSpeech.TextToSpeechClient();

        //  login
        this.client.login(token).then(() => {
            this.enabled = true;

            /*
                task include channel id, voice channel id as Object
             */
            this.status = {
                'name' : this.client.user.username,
                'id' : this.client.user.id,
                /*
                 * Task contains a list of log-in info(guild, text/voice channel. etc.).
                 * guild: string (not null)
                 * channel: string (default: "0")
                 * voice_channel: string (default: "0")
                 * status: SPEAKER_STATUS[int] (idle/joined)
                 */
                'task' : []
            };
            //  add task
            this.client.guilds.fetch()  //  get list of guild
                .then(guilds => {
                    guilds.forEach((guild, index) => {
                        //  insert
                        this.status.task[index] = {
                            'guild': guild.id,
                            'channel': '0',
                            'voice_channel': '0',
                            'status': SpeakerClient.SPEAKER_STATUS.IDLE
                        };
                    });
                });

            //  set interval
            this._timer = setInterval(() => this._intervalCallback(), SpeakerClient.INTERVAL_TIME_MS);

            console.log(`Speaker Client is Online! id: ${this.client.user.id}`);
        });
    }

    /**
     * Shutdown client and Clear interval.
     * Maybe this code throw exception, but I don't know why it has happened.
     */
    shutdown() {
        console.log('shutdown bot...');
        //  disable
        this._enabled = false;
    }

    /**
     * this code add message to queue
     * @param message
     */
    addMessage(message) {
        this.messages.push(message);
    }

    /**
     * connect voice channel. this method force client to join vc.
     * If succeeded, return True.
     * @param channel
     * @param vc
     */
    async connect(channel, vc) {
        //  join vc
        const connection = joinVoiceChannel({
            channelId: vc.id,
            guildId: vc.guildId,
            adapterCreator: vc.guild.voiceAdapterCreator,
            //  client id is used as group id.
            //  ATTENTION: you need to change here,
            //  if client cannot join some voice channels at the same time.
            group: this.client.user.id
        });

        //  wait until VoiceConnection is connecting
        const _start_time = new Date();
        while (connection.state !== VoiceConnectionReadyState) {
            //  time out
            const _now_time = new Date();
            if (_now_time - _start_time > 5000) {   //  if client cannot connect vc while 5s, return 0;
                //  kill connection
                connection.destroy();
                return false;
            }
            await this._sleep(100);
        }

        //  write status
        const guildId = vc.guildId;
        this.status.task.forEach((task, index) => {
           if (task['guild'] === guildId) {
               //   insert
               this.status.task[index]['channel'] = vc.id;
               this.status.task[index]['voice_channel'] = channel.id;
               this.status.task[index]['status'] = SpeakerClient.SPEAKER_STATUS.JOINED;

               return true;
           }
        });

        //  nothing found
        connection.disconnect();

        return false;
    }

    /**
     * disconnect from voice channel. this method attempt to leave vc.
     * If succeeded, return True.
     * @param id guild channel id
     */
    async disconnect(id) {
        //  leave vc
        const connection = getVoiceConnection(id, this.client.user.id);
        if (connection === undefined) {

            return false;
        }
        //  disconnect
        connection.disconnect();

        //  change status IDLE.
        this.status.task.forEach((task, index) => {
            if (task['guild'] === id) {
                //   insert
                this.status.task[index]['status'] = SpeakerClient.SPEAKER_STATUS.IDLE;
                return true;
            }
        });

        return false;
    }

    /**
     * If channel is tracked, return True.
     * @param id text/voice channel id
     */
    isTracked(id) {

        //  get channel with id
        this.client.channels.fetch(id)
            .then(channel => {
                //  check channel type
                if (channel.isText()) {
                    //  check status
                    this.status.task.forEach(task => {
                        if (task['status'] === SpeakerClient.SPEAKER_STATUS.JOINED){
                            //  if channelId(in task) match param's channelId, return true.
                            if (task['channel'] === id) {
                                return true;
                            }
                        }
                    });

                } else if (channel.isVoice()) {
                    const connection = getVoiceConnection(id, this.client.user.id);
                    //  if failed getting connection, return false.
                    if (connection === undefined) {
                        return false;
                    }
                    //  check vc channel
                    if (connection.joinConfig.channelId === channel.id) {
                        return true;
                    }
                } else return false;
            })
            .catch(error => {
                //  never found channel
                return false;
            });

        return false;
    }

    /**
     * generate voice message.
     * @param client google cloud client
     * @param directory
     * @param text
     * @returns {Promise<unknown>}
     */
    async voiceGenerator (client, directory, text) {
        const request = {
            input: {text: text},
            voice: {languageCode: 'ja-JP', ssmlGender: 'NEUTRAL'},
            audioConfig: {audioEncoding: 'MP3', speaking_rate: 1.25},
        };

        const [response] = await client.synthesizeSpeech(request);
        //  file path
        const r = Math.round(999);
        const path = `${directory}/${r}.mp3`;

        // const writeFile = util.promisify(fs.writeFile);
        // await writeFile(path, response.audioContent, 'binary');
        fs.writeFileSync(path, response.audioContent, 'binary');

        return new Promise(resolve => {
            resolve(path);
        });
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

        while (this.messages.length > 0) {
            const message = this.messages.shift();
            //  check bot is connected
            const connection = getVoiceConnection(message.guild , this.client.user.id);
            if (connection === undefined) continue;
            //  check voice channel id
            if (connection.joinConfig.channelId !== message.channel) continue;

            this.voiceGenerator(this._google_client, this._data_directory, message.message).then(async path => {
                const player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause,
                    },
                });
                const resource = createAudioResource(path);
                player.play(resource);
                //  subscribe
                connection.subscribe(player);

                //  wait until finish playing
                while (player.state !== AudioPlayerIdleState) {
                    await this._sleep(100);
                }
                //  continue
            });
        }
        //  do nothing
    }

    /**
     * sleep for time(ms)
     * @param time
     * @returns {Promise<null>}
     * @private
     */
    async _sleep(time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    }
}

module.exports =  SpeakerClient;
