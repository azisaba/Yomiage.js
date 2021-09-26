//  read environment valuables
const dataDirectoryPath = process.env.DATA_DIRECTORY;
const configPath = process.env.CONFIG_PATH;

//  load configuration
const Config = require('./config.js');
const config = new Config(configPath);
const configData = config.data;
console.log(configData.token);

//  init dictionary
const Dict = require('./dict.js');
const dict = new Dict(`${dataDirectoryPath}/dict/`);

//  launch clients

//  run thread
