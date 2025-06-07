const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, ApplicationIntegrationType, ChannelType, MessageFlags, EmbedBuilder } = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');

const defaultMessage = '{USERS}, Time to wrap it up!\nYou have reached the limit of {LIMIT} text messages in this channel, please keep it to media!';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set_mediaonly')
		.setDescription('Sets up a channel to watch for text messages in an image based channel.')
		.setContexts([InteractionContextType.Guild])
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.addChannelOption((option) => option.setName('channel').setDescription('The channel to watch').addChannelTypes([ChannelType.GuildText]).setRequired(true))
		.addIntegerOption((option) => option.setName('limit').setDescription('The message limit before warning a user').setMinValue(1).setMaxValue(999).setRequired(false))
		.addStringOption((option) =>
			option.setName('warning').setDescription('The warning message to send when the limit is reached. | Placeholders: {USERS}, {LIMIT}').setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	options: {
		devOnly: false,
		disabled: true,
	},
	async execute(client, interaction) {
		// Grab the options
		const channel = interaction.options.getChannel('channel');
		const limit = interaction.options.getInteger('limit');
		const warning = interaction.options.getString('warning') || defaultMessage;

		// Save the data to the database
		const guildId = interaction.guild.id;
		const channelId = channel.id;

		await WatchedChannels.findOneAndUpdate(
			{ guildId, channelId },
			{
				guildId,
				channelId,
				textLimit: limit || 5,
				customWarning: warning,
			},
			{
				upsert: true,
				new: true,
			}
		)
			.then(() => {
				const embed = new EmbedBuilder()
					.setColor(client.color)
					.setTitle('Channel Added to Watchlist')
					.setDescription(`The channel <#${channelId}> is now being watched for text messages!`)
					.addFields([
						{
							name: 'Text Limit',
							value: `${limit || 5} messages`,
							inline: false,
						},
						{
							name: 'Warning Message',
							value: warning.replace('{LIMIT}', limit || 5),
							inline: false,
						},
					])
					.setTimestamp();
				interaction.reply({
					embeds: [embed],
				});
			})
			.catch((err) => {
				console.error(err);
				return interaction.reply({
					content: `There was an error setting up the watch. Please try again later.`,
					flags: MessageFlags.Ephemeral,
				});
			});
	},
};
