// backend/modules/FlowCoordinator.js
export class FlowCoordinator {
  constructor() {
    this.activeFlows = new Map();
    this.flowHistory = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      console.log('🔄 Initializing Flow Coordinator...');
      // Any initialization logic here
      this.isInitialized = true;
      console.log('✅ Flow Coordinator initialized');
      return true;
    } catch (error) {
      console.error('❌ Flow Coordinator initialization failed:', error);
      return false;
    }
  }

  // Start a new drain flow for a user
  async startDrainFlow(userAddress, flowType = 'adaptive') {
    const flowId = `flow_${userAddress}_${Date.now()}`;
    
    const flow = {
      id: flowId,
      userAddress,
      flowType,
      status: 'started',
      startTime: new Date().toISOString(),
      steps: [],
      results: {}
    };
    
    this.activeFlows.set(flowId, flow);
    this.flowHistory.push(flow);
    
    return flowId;
  }

  // Add a step to the flow
  addFlowStep(flowId, stepName, data = {}) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return false;

    const step = {
      name: stepName,
      timestamp: new Date().toISOString(),
      data
    };
    
    flow.steps.push(step);
    return true;
  }

  // Update flow status
  updateFlowStatus(flowId, status, results = {}) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return false;

    flow.status = status;
    flow.endTime = new Date().toISOString();
    flow.results = results;

    // Move to history if completed/failed
    if (status === 'completed' || status === 'failed') {
      this.activeFlows.delete(flowId);
    }

    return true;
  }

  // Get flow status
  getFlowStatus(flowId) {
    return this.activeFlows.get(flowId) || 
           this.flowHistory.find(f => f.id === flowId);
  }

  // Get all active flows
  getActiveFlows() {
    return Array.from(this.activeFlows.values());
  }

  // Get flow history
  getFlowHistory() {
    return this.flowHistory;
  }

  // Clean up old flows (older than 24 hours)
  cleanupOldFlows() {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    this.flowHistory = this.flowHistory.filter(flow => {
      const flowTime = new Date(flow.startTime).getTime();
      return flowTime > twentyFourHoursAgo;
    });
  }
}

// Create singleton instance
export const flowCoordinator = new FlowCoordinator();