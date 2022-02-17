/**
 * Message class contains channel, message. this message will be read in vc.
 * @param {String} guild Guild id
 * @param {String} channel Voice Channel id
 * @param {String} message Message (recommend message is cleaned)
 * @constructor
 */
const YomiageMessage = (guild, channel, message) => {
    this.guild = guild;
    this.channel = channel;
    this.message = message;
}

module.exports = YomiageMessage;