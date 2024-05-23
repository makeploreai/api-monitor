const puppeteer = require('puppeteer');
const { Client, GatewayIntentBits, MessageEmbed,EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Puppeteer script to crawl and fetch URLs
async function crawl(startUrl) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const visited = new Set();
    const toVisit = [startUrl];

    while (toVisit.length > 0) {
        const currentUrl = toVisit.pop();
        if (visited.has(currentUrl)) continue;

        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle2' });
            visited.add(currentUrl);

            const links = await page.$$eval('a', anchors => anchors.map(anchor => anchor.href));
            const origin = new URL(startUrl).origin;

            links.forEach(link => {
                const newUrl = new URL(link, currentUrl).href;
                if (newUrl.startsWith(origin) && !visited.has(newUrl) && !toVisit.includes(newUrl)) {
                    toVisit.push(newUrl);
                }
            });
        } catch (error) {
            console.error(`Failed to visit ${currentUrl}:`, error);
        }
    }

    await browser.close();
    return Array.from(visited);
}

// Function to check APIs and send error messages if needed
async function checkApis(apiUrls) {
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

    if (!channel) {
        console.error('Discord channel not found');
        return;
    }

    for (const apiUrl of apiUrls) {
        try {
            const response = await axios.get(apiUrl);
            console.log(`API call to ${apiUrl} was successful!`);
        } catch (error) {
            console.error(`API call error for ${apiUrl}:`, error);

            // const errorEmbed = new MessageEmbed()
            //     .setColor('#FF0000')
            //     .setTitle('API Call Error')
            //     .setDescription(`There was an error with the API call to ${apiUrl}.`)
            //     .addField('Error Message', error.message)
            //     .addField('Suggested Measures', `
            //         1. Check if the API endpoint is correct.
            //         2. Verify if the server hosting the API is up and running.
            //         3. Ensure the API key (if any) is valid and has not expired.
            //         4. Check network connectivity and firewall settings.
            //         5. Review API documentation for any changes or updates.
            //     `);


            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('API Call Error')
                .setDescription(`There was an error with the API call to ${apiUrl}.`)
                .addFields(
                    { name: 'Error Message', value: error.message },
                    { name: 'Suggested Measures', value: `
                        1. Check if the API endpoint is correct.
                        2. Verify if the server hosting the API is up and running.
                        3. Ensure the API key (if any) is valid and has not expired.
                        4. Check network connectivity and firewall settings.
                        5. Review API documentation for any changes or updates.
                    `}
                );

            try {
                await channel.send({ embeds: [errorEmbed] });
            } catch (sendError) {
                console.error('Failed to send message to Discord channel:', sendError);
            }
        }
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Crawl the website to get all URLs
    const startUrl = process.env.START_URL;
    const allUrls = await crawl(startUrl);

    // Check the APIs periodically
    const checkInterval = process.env.CHECK_INTERVAL || 10 * 60 * 1000;
    setInterval(() => checkApis(allUrls), checkInterval);

    // Start the first check immediately upon login
    checkApis(allUrls);
});

client.login(process.env.DISCORD_TOKEN);
