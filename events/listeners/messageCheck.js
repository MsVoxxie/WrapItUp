const { Events } = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');
const { containsMedia } = require('../../functions/helpers/msgFunc');

module.exports = {
	name: Events.MessageCreate,
	runType: 'infinity',
	async execute(client, message) {
		// Check if the message is from a bot
		if (message.author.bot) return;

		// Grab User
		const channelId = message.channelId;

		// Check if the message is in a watched channel
		const watchedChannel = await WatchedChannels.findOne({ channelId: message.channel.id });
		if (!watchedChannel) return;

		// Check if the message contains media
		const hasMedia = containsMedia(message);

		// If the message is a text message, add to the channels count
		if (!client.watchedChannels.has(channelId)) {
			client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
		}

		// Get the channel count
		const channelCount = client.watchedChannels.get(channelId);

		// If the message contains media, reset the channels count
		if (hasMedia) {
			channelCount.count = 0;
			return;
		}

		// If the message does not contain media, increment the channels count
		channelCount.count += 1;

		// Check if the user is already in the chatting users array
		if (!channelCount.chattingUsers.includes(message.author.id)) {
			channelCount.chattingUsers.push(message.author.id);
		}

		console.log(`Channel: ${message.channel.name} | Users: ${channelCount.chattingUsers.join(', ')} | Count: ${channelCount.count}`);

		// Check if the channel has reached the limit
		if (channelCount.count >= watchedChannel.textLimit) {
			// Format active users
			const activeUsers = channelCount.chattingUsers.map((userId) => `<@${userId}>`).join(', ');

			// Send the warning message
			const warningMessage = watchedChannel.customWarning.replace(/{USERS}/g, activeUsers).replace(/{LIMIT}/g, watchedChannel.textLimit);
			await message.channel.send(warningMessage);

			// Reset the channel count
			client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			return;
		}
	},
};
