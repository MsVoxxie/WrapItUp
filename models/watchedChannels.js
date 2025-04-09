const { Schema, model } = require('mongoose');

const watchedChannelSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	channelId: {
		type: String,
		required: true,
	},
	textLimit: {
		type: Number,
		default: 5,
	},
	customWarning: {
		type: String,
	},
});

module.exports = model('WatchedChannels', watchedChannelSchema);
