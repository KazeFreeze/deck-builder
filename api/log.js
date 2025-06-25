const https = require("https");

// The main serverless function handler
module.exports = (req, res) => {
  // Check if the request method is POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  // Get the Discord webhook URL from environment variables for security
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    console.error("Discord webhook URL is not configured.");
    // Do not send an error message to the client that reveals server configuration details
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }

  // Extract event data and user-agent from the request body and headers
  const { eventType, eventData } = req.body;
  const userAgent = req.headers["user-agent"] || "N/A";
  const vercelForwardedFor = req.headers["x-vercel-forwarded-for"] || "N/A";

  // Create a rich embed message for Discord
  const embed = {
    title: `New Event: ${eventType}`,
    color:
      eventType === "Page View"
        ? 3447003
        : eventType === "Deck Assembled"
        ? 15158332
        : 5763719, // Blue, Red, Green for Quiz Finished
    fields: [
      { name: "User-Agent", value: userAgent, inline: false },
      { name: "IP Address", value: vercelForwardedFor, inline: true },
      { name: "Timestamp", value: new Date().toUTCString(), inline: true },
    ],
    footer: {
      text: "Study Deck Analytics",
    },
  };

  if (eventData) {
    embed.fields.push({
      name: "Details",
      value: `\`\`\`json\n${JSON.stringify(eventData, null, 2)}\n\`\`\``,
      inline: false,
    });
  }

  const discordPayload = JSON.stringify({ embeds: [embed] });

  // --- Send the data to Discord ---
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
    // Discord has received the request. We can now respond to our client.
    if (discordRes.statusCode >= 200 && discordRes.statusCode < 300) {
      res.status(200).json({ success: true, message: "Log sent." });
    } else {
      console.error(
        `Discord API responded with status: ${discordRes.statusCode}`
      );
      res
        .status(502)
        .json({
          success: false,
          error: "Failed to send log to the upstream service.",
        });
    }
  });

  discordReq.on("error", (error) => {
    console.error("Error sending data to Discord:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error while sending log.",
      });
  });

  // Write the payload and end the request
  discordReq.write(discordPayload);
  discordReq.end();
};
