const https = require("https");

// Helper function to format event data into a readable string for Discord
function formatEventDataForDiscord(eventType, eventData) {
  if (!eventData) return "";

  let details = [];
  switch (eventType) {
    case "Page View":
      if (eventData.page) {
        details.push(`**Page**: ${eventData.page}`);
      }
      break;
    case "Deck Assembled":
      if (eventData.deckCount) {
        details.push(`**Decks Selected**: ${eventData.deckCount}`);
      }
      if (eventData.decks && eventData.decks.length > 0) {
        const deckList = eventData.decks.map((d) => `• ${d}`).join("\n");
        details.push(`**Deck Names**:\n${deckList}`);
      }
      break;
    case "Quiz Finished":
      if (eventData.score) {
        details.push(`**Score**: ${eventData.score}`);
      }
      if (eventData.percentage) {
        details.push(`**Percentage**: ${eventData.percentage}`);
      }
      if (eventData.completionTime) {
        details.push(`**Time**: ${eventData.completionTime}`);
      }
      if (eventData.decks && eventData.decks.length > 0) {
        const deckList = eventData.decks.map((d) => `• ${d}`).join("\n");
        details.push(`**Decks Studied**:\n${deckList}`);
      }
      break;
    default:
      // Fallback for any other event types
      return `\`\`\`json\n${JSON.stringify(eventData, null, 2)}\n\`\`\``;
  }
  return details.join("\n");
}

// The main serverless function handler
module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    console.error("Discord webhook URL is not configured.");
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }

  const { eventType, eventData } = req.body;
  const userAgent = req.headers["user-agent"] || "N/A";
  const vercelForwardedFor = req.headers["x-vercel-forwarded-for"] || "N/A";

  const embed = {
    title: `New Event: ${eventType}`,
    color:
      eventType === "Page View"
        ? 3447003 // Blue
        : eventType === "Deck Assembled"
        ? 15158332 // Orange
        : eventType === "Quiz Finished"
        ? 5763719 // Green
        : 9807270, // Default Grey
    fields: [
      { name: "User-Agent", value: userAgent, inline: false },
      { name: "IP Address", value: vercelForwardedFor, inline: true },
      { name: "Timestamp", value: new Date().toUTCString(), inline: true },
    ],
    footer: {
      text: "Study Deck Analytics",
    },
  };

  // *** FIX START ***
  // Use the new helper function to format the details field
  const formattedDetails = formatEventDataForDiscord(eventType, eventData);
  if (formattedDetails) {
    embed.fields.push({
      name: "Details",
      value: formattedDetails,
      inline: false,
    });
  }
  // *** FIX END ***

  const discordPayload = JSON.stringify({ embeds: [embed] });

  const url = new URL(discordWebhookUrl);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": discordPayload.length,
    },
  };

  const discordReq = https.request(options, (discordRes) => {
    if (discordRes.statusCode >= 200 && discordRes.statusCode < 300) {
      res.status(200).json({ success: true, message: "Log sent." });
    } else {
      console.error(
        `Discord API responded with status: ${discordRes.statusCode}`
      );
      res.status(502).json({
        success: false,
        error: "Failed to send log to the upstream service.",
      });
    }
  });

  discordReq.on("error", (error) => {
    console.error("Error sending data to Discord:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while sending log.",
    });
  });

  discordReq.write(discordPayload);
  discordReq.end();
};
