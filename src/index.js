const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Get the API URL from the environment variables
const apiUrl = process.env.API_URL;

// Function to check the API and send error messages if needed
async function checkApi() {
  try {
    const response = await axios.get(apiUrl);
    console.log(`API call to ${apiUrl} was successful!`);
  } catch (error) {
    console.error(`API call error for ${apiUrl}:`, error);
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) {
      const errorMessage = `
                There was an error with the API call to ${apiUrl}.
                Error: ${error.message}
                Suggested Measures:
                1. Check if the API endpoint is correct.
                2. Verify if the server hosting the API is up and running.
                3. Ensure the API key (if any) is valid and has not expired.
                4. Check network connectivity and firewall settings.
                5. Review API documentation for any changes or updates.
            `;
      channel.send(errorMessage);
    }
  }
}


// Periodically check the API every 5 minutes
setInterval(checkApi, 2 * 60 * 1000);

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Start the first check immediately upon login
  checkApi();
});

client.login(process.env.DISCORD_TOKEN);
