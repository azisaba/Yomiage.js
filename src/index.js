const token = process.env.DISCORD_TOKEN;
const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

console.log(`token: ${token}`);

client.on('ready', () => {
    console.log(`Log-in as ${client.user.tag}`);
});

client.on('message', async msg => {

});

client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log(`done log-in`)
});