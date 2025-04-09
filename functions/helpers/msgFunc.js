function containsMedia(message) {
	// Check for direct attachments (images, videos, etc.)
	if (message.attachments.size > 0) {
		return true;
	}

	// Check for embeds with media (images, videos, etc.)
	if (message.embeds.some((embed) => embed.image || embed.video || embed.thumbnail)) {
		return true;
	}

	// Check if message contains a URL (could be an image or video link)
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	if (urlRegex.test(message.content)) {
		return true;
	}

	return false;
}

module.exports = {
	containsMedia,
};
