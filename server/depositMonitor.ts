import { tronService } from './tronService';
import { storage } from './storage';

class DepositMonitor {
  private isRunning: boolean = false;
  private pollInterval: number = 30000; // Poll every 30 seconds
  private lastProcessedTxId: string | undefined;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('💰 DepositMonitor initialized');
  }

  /**
   * Start monitoring for deposits
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Deposit monitor is already running');
      return;
    }

    console.log('🚀 Starting deposit monitor...');
    this.isRunning = true;

    // Check immediately on start
    this.checkForDeposits();

    // Then check every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkForDeposits();
    }, this.pollInterval);

    console.log(`✅ Deposit monitor started (polling every ${this.pollInterval / 1000}s)`);
  }

  /**
   * Stop monitoring for deposits
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping deposit monitor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Deposit monitor stopped');
  }

  /**
   * Check for new deposits and credit users
   */
  private async checkForDeposits() {
    try {
      const deposits = await tronService.getNewDeposits(this.lastProcessedTxId);

      if (deposits.length === 0) {
        return;
      }

      console.log(`💎 Found ${deposits.length} new deposit(s)`);

      for (const deposit of deposits) {
        try {
          // Convert USDT to MERE (1 MERE = 0.5 USDT, so USDT * 2 = MERE)
          const mereAmount = deposit.amount * 2;

          console.log(`📥 Processing deposit: ${deposit.amount} USDT (${mereAmount} MERE) from ${deposit.from}`);
          console.log(`   TX: ${deposit.txId}`);

          // Since we're using Option A (single platform wallet),
          // we need to manually identify which user made the deposit
          // For now, we'll store this as a pending deposit that needs manual assignment
          // In a production system, you'd either:
          // 1. Generate unique addresses per user (Option B)
          // 2. Have users register their sending address before depositing
          // 3. Use a deposit code system

          // For this implementation, we'll create a transaction record as "pending"
          // The admin can then assign it to the correct user
          await storage.createTransaction({
            userId: 'system', // System user for unassigned deposits
            type: 'deposit',
            amountMere: mereAmount.toString(),
            amountUsd: deposit.amount.toString(),
            description: `Pending deposit from ${deposit.from}`,
            status: 'pending',
            txHash: deposit.txId,
          });

          console.log(`✅ Deposit recorded as pending (needs manual assignment)`);
          console.log(`   To credit a user: Update transaction and credit ${mereAmount} MERE`);
          
        } catch (error) {
          console.error(`❌ Error processing deposit ${deposit.txId}:`, error);
        }
      }

      // Update last processed transaction ID
      if (deposits.length > 0) {
        this.lastProcessedTxId = deposits[0].txId;
      }

    } catch (error) {
      console.error('❌ Error checking for deposits:', error);
    }
  }

  /**
   * Get the current monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
      lastProcessedTxId: this.lastProcessedTxId,
    };
  }
}

// Export singleton instance
export const depositMonitor = new DepositMonitor();
