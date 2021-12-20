const Config = require('./config.js');
const Dict = require('./dict.js');
const ListenerClient = require('./listener_client.js');
const SpeakerClient = require('./speaker_client.js');


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

//  check exception
if (speaker_tokens.length <= 0) {
    console.log("Listener bot must be more than 1 token.");
    process.exit(0);
}

//  launch listener client
const listener = new ListenerClient(listener_token, dict);

//  launch speaker client
const speakers = [];
speaker_tokens.forEach((token) => {
    const speaker = new SpeakerClient(token);
    //  insert instance
    speakers.push(speaker);
});
