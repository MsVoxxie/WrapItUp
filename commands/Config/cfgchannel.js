const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	PermissionFlagsBits,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
	PermissionsBitField,
	codeBlock,
	EmbedBuilder,
} = require('discord.js');
const WatchedChannels = require('../../models/watchedChannels');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cfgchannel')
		.setDescription('Configure WrapItUp settings for this channel')
		.setContexts([InteractionContextType.Guild])
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	options: {
		devOnly: false,
		disabled: false,
	},
	async execute(client, interaction) {
		const modal = new ModalBuilder().setCustomId('cfgchannel-config-modal').setTitle('Configure Channel');

		const watchTypeInput = new TextInputBuilder()
			.setCustomId('watchType')
			.setLabel('Watch Type (media/text)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('media')
			.setRequired(false);

		const limitInput = new TextInputBuilder()
			.setCustomId('textLimit')
			.setLabel('Message Limit')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('10')
			.setRequired(false)
			.setMinLength(1);

		const threadInput = new TextInputBuilder()
			.setCustomId('enableThread')
			.setLabel('Enable thread creation? (yes/no)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('no')
			.setRequired(false);

		// const threadDeleteInput = new TextInputBuilder() // Temporarily removing this option from the modal
		// 	.setCustomId('shouldThreadDelete')
		// 	.setLabel('Delete moved thread messages? (yes/no)')
		// 	.setStyle(TextInputStyle.Short)
		// 	.setPlaceholder('no')
		// 	.setRequired(false);

		const warningInput = new TextInputBuilder()
			.setCustomId('customWarning')
			.setLabel('Custom Warning ({USERS}, {LIMIT})')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Leave blank for default warnings based on watch type')
			.setRequired(false);

		modal.addComponents(
			new ActionRowBuilder().addComponents(watchTypeInput),
			new ActionRowBuilder().addComponents(limitInput),
			new ActionRowBuilder().addComponents(threadInput),
			// new ActionRowBuilder().addComponents(threadDeleteInput), // Temporarily removing this option from the modal
			new ActionRowBuilder().addComponents(warningInput)
		);

		await interaction.showModal(modal);
	},

	async handleModalSubmit(client, interaction) {
		if (interaction.customId !== 'cfgchannel-config-modal') return;

		const watchType = interaction.fields.getTextInputValue('watchType').toLowerCase() || 'media';
		const textLimit = parseInt(interaction.fields.getTextInputValue('textLimit'), 10) || 10;
		const enableThreadRaw = interaction.fields.getTextInputValue('enableThread').toLowerCase() || 'no';
		// const shouldThreadDeleteRaw = interaction.fields.getTextInputValue('shouldThreadDelete').toLowerCase() || 'no'; // Temporarily removing this option from the modal
		const customWarningInput = interaction.fields.getTextInputValue('customWarning');

		// Validate watchType
		if (!['media', 'text'].includes(watchType)) {
			return interaction.reply({
				content: 'Watch Type must be "media" or "text".',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Validate textLimit
		if (isNaN(textLimit) || textLimit < 1 || textLimit > 100) {
			return interaction.reply({
				content: 'Message limit must be a number between 1 and 100.',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Validate enableThread
		if (!['yes', 'no'].includes(enableThreadRaw)) {
			return interaction.reply({
				content: 'Enable thread creation must be "yes" or "no".',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Validate shouldThreadDelete
		// Only validate shouldThreadDeleteRaw if thread creation is enabled
		// if (enableThreadRaw === 'yes' && !['yes', 'no'].includes(shouldThreadDeleteRaw)) { // Temporarily removing this option from the modal
		// 	return interaction.reply({
		// 		content: 'Should thread delete must be "yes" or "no".',
		// 		flags: MessageFlags.Ephemeral,
		// 	});
		// }

		// If thread creation is disabled but shouldThreadDeleteRaw is provided, warn the user
		// if (enableThreadRaw !== 'yes' && shouldThreadDeleteRaw && shouldThreadDeleteRaw !== 'no') { // Temporarily removing this option from the modal
		// 	return interaction.reply({
		// 		content: 'Thread creation must be enabled to enable message deletion.',
		// 		flags: MessageFlags.Ephemeral,
		// 	});
		// }

		const enableThread = enableThreadRaw === 'yes';
		// const shouldThreadDelete = shouldThreadDeleteRaw === 'yes'; // Temporarily removing this option from the modal

		// If thread creation is enabled, append a standard line to the custom warning
		let threadWarning = '';
		if (enableThread) {
			threadWarning = '\n\nWould you like to create a thread to continue the conversation?';
		}

		const warningTemplates = {
			media: `Hey {USERS}, this channel is intended for media! Please keep it to images, gifs, or videos.${threadWarning}`,
			text: `Hey {USERS}, this channel is intended for text! Please keep it to text messages.${threadWarning}`,
		};
		const customWarning = customWarningInput || warningTemplates[watchType];

		await WatchedChannels.findOneAndUpdate(
			{ guildId: interaction.guild.id, channelId: interaction.channel.id },
			{ $set: { watchType, textLimit, customWarning, enableThread } },
			{ upsert: true }
		);

		// If thread creation is enabled, check for the create public threads permission
		let permissionErrors = [];
		if (enableThread) {
			const botPermissions = interaction.channel.permissionsFor(interaction.guild.members.me);
			const permissionName = new PermissionsBitField(PermissionFlagsBits.CreatePublicThreads).toArray()[0];
			if (!botPermissions.has(PermissionFlagsBits.CreatePublicThreads)) {
				permissionErrors.push(permissionName);
			}
		}

		// If delete moved messages is enabled, check for the manage messages permission
		// if (shouldThreadDelete) { // Temporarily removing this option from the modal
		// 	const botPermissions = interaction.channel.permissionsFor(interaction.guild.members.me);
		// 	const permissionName = new PermissionsBitField(PermissionFlagsBits.ManageMessages).toArray()[0];
		// 	if (!botPermissions.has(PermissionFlagsBits.ManageMessages)) {
		// 		permissionErrors.push(permissionName);
		// 	}
		// }

		// Finalize message with all of the config details
		const embed = new EmbedBuilder()
			.setTitle('Channel Configuration Updated')
			.setColor(client.color)
			.setDescription(
				`The channel has been successfully configured with the following settings:${
					permissionErrors.length > 0 ? `\n\nHowever, I am missing the following permissions: ${permissionErrors.join(', ')}` : ''
				}`
			)
			.addFields(
				{ name: 'Watch Type', value: watchType, inline: true },
				{ name: 'Message Limit', value: textLimit.toString(), inline: true },
				{ name: 'Thread Creation', value: enableThread ? 'Enabled' : 'Disabled', inline: true },
				// { name: 'Delete Moved Messages', value: shouldThreadDelete ? 'Yes' : 'No', inline: true }, // Temporarily removing this option from the modal
				{ name: 'Warning Message', value: customWarning.length > 1024 ? customWarning.slice(0, 1021) + '...' : customWarning }
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	},
};
