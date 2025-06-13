const { EventEmitter } = require("events");

class SafeEvents extends EventEmitter {
  constructor(report) {
    super();
    this.report = report;
  }

  on(event, listener) {
    const safeListener = async (...args) => {
      try {
        await listener(...args);
      } catch (e) {
        this.report(e);
      }
    };

    super.on(event, safeListener);
  }
}

module.exports = SafeEvents;
