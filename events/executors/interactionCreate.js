const { Events } = require('discord.js');
const Logger = require('../../functions/logging/logger');

module.exports = {
	name: Events.InteractionCreate,
	runType: 'infinity',
	async execute(client, interaction) {
		if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
			// Get command, return if no command found.
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return Logger.error(`No command matching ${interaction.commandName} was found.`);

			try {
				// Check if command is dev only
				if (command.options.devOnly) {
					if (!process.env.DEVELOPERS.includes(interaction.user.id)) {
						return interaction.reply({ content: 'This command is for developers only.', ephemeral: true });
					}
				}

				// Check if command is disabled
				if (command.options.disabled) {
					return interaction.reply({ content: 'This command is disabled.', ephemeral: true });
				}

				// Execute Command
				await command.execute(client, interaction);
			} catch (error) {
				Logger.error(error);
			}
		} else if (interaction.isStringSelectMenu()) {
			const [commandName] = interaction.customId.split('-');
			const command = interaction.client.commands.get(commandName);
			if (command && typeof command.handleSelectMenu === 'function') {
				try {
					await command.handleSelectMenu(client, interaction);
				} catch (error) {
					Logger.error(error);
				}
			}
		} else if (interaction.isModalSubmit()) {
			// Find the command that matches the modal's customId prefix
			const [commandName] = interaction.customId.split('-'); // e.g., 'wrapitup-config-modal'
			const command = interaction.client.commands.get(commandName) || interaction.client.commands.find((cmd) => interaction.customId.startsWith(cmd.data.name));
			if (command && typeof command.handleModalSubmit === 'function') {
				try {
					await command.handleModalSubmit(client, interaction);
				} catch (error) {
					Logger.error(error);
				}
			}
		} else if (interaction.isButton()) {
			const [handlerName] = interaction.customId.split('-');
			let handler = interaction.client.commands.get(handlerName) || interaction.client.events.get(handlerName);

			if (handler && typeof handler.handleButton === 'function') {
				try {
					await handler.handleButton(client, interaction);
				} catch (error) {
					Logger.error(error);
				}
			}
		}
	},
};
