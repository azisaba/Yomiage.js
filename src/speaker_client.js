/**
 * @fileOverview Class of Speaker client.
 * @author testusuke
 */

const {Client, Intents} = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    AudioPlayerStatus
} = require('@discordjs/voice');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');

class SpeakerClient {
    static INTERVAL_TIME_MS = 1000;
    static SPEAKER_STATUS = {
        IDLE: 0, JOINED: 1
    };

    constructor(token, data_directory) {
        this.client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]});
        this._data_directory = data_directory;
        //  init message queue
        this.messages = [];
        //  init skip queue
        this._skip_queue = [];

        //  init google client
        this._google_client = new textToSpeech.TextToSpeechClient();

        //  login
        this.client.login(token).then(() => {
            this._enabled = true;
            this._lock = false;
            this._destroy_request = false;

            /*
                task include channel id, voice channel id as Object
             */
            this.status = {
                'name': this.client.user.username, 'id': this.client.user.id, /*
                 * Task contains a list of log-in info(guild, text/voice channel. etc.).
                 * guild: string (not null)
                 * channel: string (default: "0")
                 * voice_channel: string (default: "0")
                 * status: SPEAKER_STATUS[int] (idle/joined)
                 */
                'task': []
            };
            //  add task
            this.client.guilds.fetch()  //  get list of guild
                .then(guilds => {
                    //  map to array
                    guilds = guilds.map(guild => guild);

                    guilds.forEach((guild, index) => {
                        //  insert
                        this.status.task[index] = {
                            'guild': guild.id,
                            'channel': 0,
                            'voice_channel': 0,
                            'status': SpeakerClient.SPEAKER_STATUS.IDLE,
                            'speed': 1.25
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
        //  check permission
        const permission = vc.guild.me.permissionsIn(vc);
        if (!permission.has("CONNECT") || !permission.has("SPEAK")) return false;

        //  join vc
        const guild = this.client.guilds.cache.find(g => g.id === vc.guild.id);
        const connection = joinVoiceChannel({
            channelId: vc.id,
            guildId: vc.guildId,
            adapterCreator: guild.voiceAdapterCreator, //  client id is used as group id.
            //  ATTENTION: you need to change here,
            //  if client cannot join some voice channels at the same time.
            group: this.client.user.id
        });

        //  wait until VoiceConnection is connecting
        const _start_time = new Date();
        while (connection.state.status !== 'signalling') {
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
        const status_index = this.status.task.findIndex((task) => task['guild'] === guildId)
        if (status_index !== -1) {
            this.status.task[status_index]['channel'] = channel.id;
            this.status.task[status_index]['voice_channel'] = vc.id;
            this.status.task[status_index]['status'] = SpeakerClient.SPEAKER_STATUS.JOINED;

            return true;
        }


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
        //  request
        if (this._lock) {
            this._destroy_request = true;
            while (this._destroy_request) await this._sleep(100);
        }

        //  leave vc
        const connection = getVoiceConnection(id, this.client.user.id);
        if (connection === undefined) {
            return false;
        }

        //  disconnect and destroy
        connection.destroy();

        //  change status IDLE.
        const status_index = this.status.task.findIndex((task) => task['guild'] === id);
        if (status_index !== -1) {
            //   insert
            this.status.task[status_index]['status'] = SpeakerClient.SPEAKER_STATUS.IDLE;
            return true;
        }

        return false;
    }

    /**
     * If channel is tracked, return True.
     * @param id text/voice channel id
     */
    async isTracked(id) {
        //  get channel with id
        return await this.client.channels.fetch(id)
            .then(channel => {

                //  check channel type
                if (channel.isText()) {
                    //  check status
                    for (const task of this.status.task) {
                        if (task['status'] === SpeakerClient.SPEAKER_STATUS.JOINED) {
                            //  if channelId(in task) match param's channelId, return true.
                            if (task['channel'] === id) {
                                return true;
                            }
                        }
                    }
                    //  default
                    return false;
                } else if (channel.isVoice()) {
                    const connection = getVoiceConnection(channel.guild.id, this.client.user.id);
                    //  if failed getting connection, return false.
                    if (connection === undefined) {
                        return false;
                    }
                    //  check connection is destroyed.
                    if (connection.state.status === VoiceConnectionStatus.Destroyed) {
                        return false;
                    }
                    //  check vc channel
                    if (connection.joinConfig.channelId === channel.id) {
                        return true;
                    }

                    //  default
                    return false;
                } else return false;    //  return false if channel is neither text nor voice.
            })
            .catch(() => {
                //  never found channel
                return false;
            });
    }

    /**
     * check bot is able to connect vc
     * @param guildId
     */
    isConnectable(guildId) {
        const connection = getVoiceConnection(guildId, this.client.user.id);
        if (connection === undefined) {
            return true;
        }
        if (connection.state.status === VoiceConnectionStatus.Destroyed) {
            return true;
        }
        return false;
    }

    /**
     * check bot is able to access guild
     * @param guildId
     */
    async isAccessible(guildId) {
        const guilds = await this.client.guilds.fetch()
        return guilds.find(guild => guild.id === guildId) !== undefined;
    }

    /**
     * get voice channel id from text channel id
     * couldn't find channel, return undefined
     * @param channelId Text channel id
     */
    getVoiceChannelId(channelId) {
        for (const task of this.status.task) {
            if (task['channel'] === channelId) {
                return task['voice_channel'];
            }
        }
        return undefined;
    }

    /**
     * set speaking rate
     * @param guildId
     * @param speed
     * @returns {boolean}
     */
    setSpeakingRate(guildId, speed) {
        const status_index = this.status.task.findIndex((task) => task['guild'] === guildId);
        if (status_index !== -1) {
            //   insert
            this.status.task[status_index]['speed'] = speed;
            return true;
        }
        return false;
    }

    /**
     * get speaking rate
     * @param guildId
     * @returns {number|*}
     */
    getSpeakingRate(guildId) {
        const status_index = this.status.task.findIndex((task) => task['guild'] === guildId);
        if (status_index !== -1) {
            return this.status.task[status_index]['speed'];
        }
        return 1;
    }

    /**
     * skip speech
     * @param voiceChannelId
     * @return void
     */
    skipText(voiceChannelId) {
        this._skip_queue.push(voiceChannelId);
    }

    /**
     * generate voice message.
     * @param client google cloud client
     * @param directory
     * @param text
     * @param speed
     * @returns {Promise<unknown>}
     */
    async voiceGenerator(client, directory, text, speed) {
        const request = {
            input: {text: text},
            voice: {languageCode: 'ja-JP', ssmlGender: 'NEUTRAL'},
            audioConfig: {audioEncoding: 'MP3', speakingRate: speed},
        };

        const [response] = await client.synthesizeSpeech(request);
        //  file path
        const r = Math.floor(Math.random() * 100);
        const path = `${directory}/${r}.mp3`;

        fs.writeFileSync(path, response.audioContent, 'binary');

        return new Promise(resolve => {
            resolve(path);
        });
    }

    /**
     * Interval callback of reading message
     * @private
     */
    async _intervalCallback() {
        //  check shutdown
        if (!this._enabled) {
            //  cancel
            clearInterval(this._timer);
            //  logout
            this.client.destroy();

            console.log('shutdown done.');
        }

        while (this._lock) await this._sleep(100);

        while (this.messages.length > 0) {
            const message = this.messages.shift();
            //  log
            console.log(`vc: ${message.channel} message: ${message.message}`);
            //  check bot is connected
            const connection = getVoiceConnection(message.guild, this.client.user.id);
            if (connection === undefined) continue;

            //  check voice channel id
            if (connection.joinConfig.channelId !== message.channel) continue;

            const speakingRate = this.getSpeakingRate(message.guild);
            //  lock
            this._lock = true;
            await this.voiceGenerator(this._google_client, this._data_directory, message.message, speakingRate).then(async path => {
                const player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Play,
                    }
                });

                const resource = createAudioResource(path);
                player.play(resource);
                //  subscribe
                const subscription = connection.subscribe(player);
                if (subscription === undefined) {
                    console.log("subscription undefined")
                    return
                }

                //  wait until finish playing
                while (player.state.status !== AudioPlayerStatus.Idle) {
                    //  destroy request
                    if (this._destroy_request) {
                        //  stop
                        player.stop(true);
                        subscription.unsubscribe();
                        //  turn off
                        this._destroy_request = false;
                        break;
                    }
                    //  skip
                    if (this._skip_queue.includes(message.channel)) {
                        //  stop
                        player.stop(true);
                        //  remove value
                        const index = this._skip_queue.indexOf(message.channel);
                        if (index > -1) {
                            this._skip_queue.splice(index, 1);
                        }
                        break;
                    }
                    await this._sleep(100);
                }

                try {
                    subscription.unsubscribe()
                    fs.unlinkSync(path);
                } catch (error) {
                    console.log(`error: ${path} is not exist`);
                }
            });
            this._lock = false;
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

module.exports = SpeakerClient;
