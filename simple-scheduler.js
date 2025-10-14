// Simple scheduler to replace node-cron
export class SimpleScheduler {
  static schedule(intervalMs, callback) {
    return setInterval(callback, intervalMs);
  }
  
  static scheduleDaily(callback) {
    // Run once per day (24 hours)
    return setInterval(callback, 1000 * 60 * 60 * 24);
  }
  
  static scheduleHourly(callback) {
    // Run once per hour
    return setInterval(callback, 1000 * 60 * 60);
  }
}
