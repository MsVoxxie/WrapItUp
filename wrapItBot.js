// Configuration File
const dotenv = require('dotenv');
dotenv.config();

// Discord Classes
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('events').EventEmitter.defaultMaxListeners = 16;

// Define Client
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	allowedMentions: { parse: [] },
});

// Define Collections
client.commands = new Collection();
client.events = new Collection();
client.watchedChannels = new Collection();

// Client Constants
client.color = '#7289A7';

// Run Loaders
client.mongoose = require('./core/loaders/mongooseLoader');
require('./core/loaders/commandLoader')(client);
require('./core/loaders/eventLoader')(client);

// Every 10 minutes decrease the counter of all channels by 1 unless already 0
setInterval(() => {
	client.watchedChannels.forEach((count, channelId) => {
		const channel = client.watchedChannels.get(channelId);
		// If the count is greater than 0, decrease it by 1
		if (channel.count > 0) {
			channel.count -= 1;
		}

		// If the count is 0, remove the channel from the watched channels
		if (channel.count === 0) {
			client.watchedChannels.delete(channelId);
		}
	});
}, 5 * 60 * 1000); // 5 minutes

client.login(process.env.DISCORD_TOKEN);
