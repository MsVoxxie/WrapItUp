const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');
const { containsMedia } = require('../../functions/helpers/msgFunc');

module.exports = {
	name: Events.MessageCreate,
	handlerName: 'channelWatch',
	runType: 'infinity',
	async execute(client, message) {
		if (message.author.bot) return;

		const channelId = message.channelId;
		const watchedChannel = await WatchedChannels.findOne({ channelId: message.channel.id });
		if (!watchedChannel) return;

		const hasMedia = containsMedia(message);

		// Enforce channel type
		if (watchedChannel.watchType === 'media' && !hasMedia) {
			// Track text messages in media channels
			if (!client.watchedChannels.has(channelId)) {
				client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			}
			const channelCount = client.watchedChannels.get(channelId);
			channelCount.count += 1;

			const activeUsers = channelCount.chattingUsers.map((u) => `<@${u.userId}>`).join(', ');
			const warningMessage = watchedChannel.customWarning.replace(/{USERS}/g, activeUsers).replace(/{LIMIT}/g, watchedChannel.textLimit);

			if (!channelCount.chattingUsers.some((u) => u.userId === message.author.id)) {
				channelCount.chattingUsers.push({ userId: message.author.id, lastMsg: Date.now() });
			}

			if (channelCount.count >= watchedChannel.textLimit) {
				// If thread creation is enabled, add a button to offer it
				if (watchedChannel.enableThread && message.channel.type === ChannelType.GuildText) {
					const row = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('channelWatch-create-thread').setLabel('Create Thread?').setStyle(ButtonStyle.Primary),
						new ButtonBuilder().setCustomId('do-nothing-button').setLabel('Expires in 1 minute').setStyle(ButtonStyle.Secondary).setDisabled(true)
					);

					const sentMsg = await message.channel.send({
						content: warningMessage,
						components: [row],
					});

					// Remove the button after 1 minute
					setTimeout(async () => {
						try {
							if (sentMsg.content.includes('## Thread created and recent messages moved!')) return;
							await sentMsg.edit({ content: 'Thread timer expired.', components: [] });
						} catch (err) {
							null;
						}
					}, 1 * 60 * 1000);
				} else {
					await message.channel.send(warningMessage);
				}
				client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			}
			return;
		}

		// If media is posted in a media channel, reset the count
		if (watchedChannel.watchType === 'media' && hasMedia) {
			client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			return;
		}

		// Enforce text-only channels
		if (watchedChannel.watchType === 'text' && hasMedia) {
			// Track media messages in text channels
			if (!client.watchedChannels.has(channelId)) {
				client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			}
			const channelCount = client.watchedChannels.get(channelId);
			channelCount.count += 1;

			const activeUsers = channelCount.chattingUsers.map((u) => `<@${u.userId}>`).join(', ');
			const warningMessage = watchedChannel.customWarning.replace(/{USERS}/g, activeUsers).replace(/{LIMIT}/g, watchedChannel.textLimit);

			if (!channelCount.chattingUsers.some((u) => u.userId === message.author.id)) {
				channelCount.chattingUsers.push({ userId: message.author.id, lastMsg: Date.now() });
			}

			if (channelCount.count >= watchedChannel.textLimit) {
				// If thread creation is enabled, add a button to offer it
				if (watchedChannel.enableThread && message.channel.type === ChannelType.GuildText) {
					const row = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('channelWatch-create-thread').setLabel('Create Thread?').setStyle(ButtonStyle.Primary),
						new ButtonBuilder().setCustomId('do-nothing-button').setLabel('Expires in 1 minute').setStyle(ButtonStyle.Secondary).setDisabled(true)
					);

					const sentMsg = await message.channel.send({
						content: warningMessage,
						components: [row],
					});

					// Remove the button after 1 minute
					setTimeout(async () => {
						try {
							if (sentMsg.content.includes('## Thread created and recent messages moved!')) return;
							await sentMsg.edit({ content: 'Thread timer expired.', components: [] });
						} catch (err) {
							null;
						}
					}, 1 * 60 * 1000);
				} else {
					await message.channel.send(warningMessage);
				}

				client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			}
			return;
		}

		// If text is posted in a text channel, reset the count
		if (watchedChannel.watchType === 'text' && !hasMedia) {
			client.watchedChannels.set(channelId, { count: 0, chattingUsers: [] });
			return;
		}
	},

	// Handle button interaction for creating threads
	async handleButton(client, interaction) {
		if (interaction.customId !== 'channelWatch-create-thread') return;

		const channel = interaction.channel;
		const watchedChannel = await require('../../models/watchedChannels').findOne({ channelId: channel.id });
		if (!watchedChannel) return interaction.reply({ content: 'Channel is not configured.', flags: MessageFlags.Ephemeral });

		const limit = watchedChannel.textLimit;

		// Fetch more messages to ensure we get them all
		const fetched = await channel.messages.fetch({ limit: limit + 3, force: true });
		const allMessages = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

		// Filter out bot messages
		const userMessages = allMessages.filter((msg) => !msg.author.bot);

		// Use the oldest message as the starter message
		const starterMessage = userMessages[userMessages.length - limit - 1] || userMessages[0];
		const messagesToMove = userMessages.slice(-limit);

		// Create thread from the warning message
		const threadName = `Continued Conversation`;
		const thread = await starterMessage.startThread({
			name: threadName,
			autoArchiveDuration: 60,
		});

		// Combine messages into chunks of up to 2000 characters, without splitting user messages
		const MAX_LENGTH = 1000;
		let chunks = [];
		let currentChunk = '';
		let allAttachments = [];

		for (const msg of messagesToMove) {
			const authorName = msg.member?.displayName || msg.author.username;
			const line = `**${authorName}:** ${msg.content || '[No text content]'}\n`;

			// If adding this line would exceed the limit, start a new chunk
			if (currentChunk.length + line.length > MAX_LENGTH) {
				chunks.push(currentChunk);
				currentChunk = '';
			}
			currentChunk += line;

			// Collect attachments
			allAttachments.push(...msg.attachments.values());
		}
		if (currentChunk) chunks.push(currentChunk);

		// Discord allows max 10 attachments per message
		const attachmentChunks = [];
		for (let i = 0; i < allAttachments.length; i += 10) {
			attachmentChunks.push(allAttachments.slice(i, i + 10));
		}

		// Send the text chunks (first chunk with up to 10 attachments, rest as needed)
		for (let i = 0; i < chunks.length; i++) {
			await thread.send({
				content: chunks[i],
				files: i === 0 ? attachmentChunks[0] || [] : [],
			});
		}
		// If there are more attachments, send them in additional messages
		for (let i = 1; i < attachmentChunks.length; i++) {
			await thread.send({ files: attachmentChunks[i] });
		}

		// If shouldThreadDelete is enabled, delete the moved messages
		if (watchedChannel.shouldThreadDelete) {
			const messageIds = messagesToMove.filter((msg) => msg.id !== starterMessage.id).map((msg) => msg.id);
			await channel.bulkDelete(messageIds, true).catch((e) => console.log(e));
		}

		// Remove the button from the original message
		await interaction.message.edit({ content: `## Thread created and recent messages moved!\n### [Go to thread](${thread.url})`, components: [] });
		await interaction.deferUpdate();
	},
};
