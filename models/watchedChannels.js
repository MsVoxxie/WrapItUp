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
	watchType: {
		type: String,
		enum: ['media', 'text'],
		required: true,
	},
	textLimit: {
		type: Number,
		default: 5,
	},
	customWarning: {
		type: String,
	},
	enableThread: {
		type: Boolean,
		default: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = model('WatchedChannels', watchedChannelSchema);
