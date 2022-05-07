const Config = require('./config.js');
const Dict = require('./dict.js');
const ListenerClient = require('./listener_client.js');
const SpeakerClient = require('./speaker_client.js');
const ClientManager = require('./client_manager.js');


///////////////////////////
//  read environment valuables
const dataDirectoryPath = process.env.DATA_DIRECTORY;


///////////////////////////
//  load configuration
const configData = Config.getConfig();

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
const listener = new ListenerClient(listener_token, dict, client_manager);
client_manager.listener = listener;

//  launch speaker client
const speakers = [];
speaker_tokens.forEach((token) => {
    const speaker = new SpeakerClient(token, dataDirectoryPath);
    //  add instance
    speakers.push(speaker);
});
client_manager.speakers = speakers;
