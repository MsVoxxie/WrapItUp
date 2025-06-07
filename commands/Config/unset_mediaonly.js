const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, ApplicationIntegrationType, ChannelType, MessageFlags, EmbedBuilder } = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unset_mediaonly')
		.setDescription('Removes a channel from being watched for text messages in an image based channel.')
		.setContexts([InteractionContextType.Guild])
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.addChannelOption((option) => option.setName('channel').setDescription('The channel to remove').addChannelTypes([ChannelType.GuildText]).setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	options: {
		devOnly: false,
		disabled: true,
	},
	async execute(client, interaction) {
		// Grab the options
		const channel = interaction.options.getChannel('channel');

		// Remove the data from the database
		const guildId = interaction.guild.id;
		const channelId = channel.id;

		await WatchedChannels.findOneAndDelete({ guildId, channelId })
			.then(() => {
				const embed = new EmbedBuilder()
					.setColor(client.color)
					.setTitle('Channel Removed from Watchlist')
					.setDescription(`The channel <#${channelId}> is no longer being watched for text messages!`);
				interaction.reply({ embeds: [embed] });
			})
			.catch((err) => {
				console.error(err);
				return interaction.reply({
					content: `There was an error removing the watch. Please try again later.`,
					flags: MessageFlags.Ephemeral,
				});
			});
	},
};
