const Config = require('./config.js');
const Dict = require('./dict.js');
const ListenerClient = require('./listener_client.js');
const SpeakerClient = require('./speaker_client.js');
const ClientManager = require('./client_manager.js');


///////////////////////////
//  read environment valuables
const dataDirectoryPath = process.env.DATA_DIRECTORY;
const configPath = process.env.CONFIG_PATH;


///////////////////////////
//  load configuration
const config = new Config(configPath);
const configData = config.data;
console.log(configData.token);


///////////////////////////
//  init dictionary
const dict = new Dict(`${dataDirectoryPath}`);


///////////////////////////
//  launch clients
const listener_token = configData.token.listener;
const speaker_tokens = configData.token.speaker;
//  create manager
const client_manager = new ClientManager();

//  check exception
if (speaker_tokens.length <= 0) {
    console.log("Listener bot must be more than 1 token.");
    process.exit(0);
}

//  launch listener client
const listener = new ListenerClient(listener_token, dict);
client_manager.setListener(listener);

//  launch speaker client
speaker_tokens.forEach((token) => {
    const speaker = new SpeakerClient(token);
    //  add instance
    client_manager.addSpeaker(speaker);
});
