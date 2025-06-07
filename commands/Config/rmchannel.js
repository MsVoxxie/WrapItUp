const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, ApplicationIntegrationType, MessageFlags } = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rmchannel')
		.setDescription('Remove this channel from the watch list')
		.setContexts([InteractionContextType.Guild])
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	options: {
		devOnly: false,
		disabled: false,
	},
	async execute(client, interaction) {
		const result = await WatchedChannels.findOneAndDelete({
			guildId: interaction.guild.id,
			channelId: interaction.channel.id,
		});

		if (result) {
			await interaction.reply({ content: 'Channel removed from my watch list.', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'This channel was not being watched.', flags: MessageFlags.Ephemeral });
		}
	},
};
