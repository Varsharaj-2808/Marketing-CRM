const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
};

const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.INFO;
    this.timers = new Map();
  }

  setLevel(level) {
    if (level in LOG_LEVELS) {
      this.level = LOG_LEVELS[level];
    }
  }

  _formatTimestamp() {
    return new Date().toISOString();
  }

  _log(level, message, ...args) {
    if (level < this.level) return;

    const timestamp = this._formatTimestamp();
    const levelName = LOG_LEVEL_NAMES[level] || 'UNKNOWN';
    const prefix = `[${timestamp}] [${levelName}]`;

    if (args.length > 0) {
      console.log(`${prefix} ${message}`, ...args);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, message, ...args);
  }

  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, message, ...args);
  }

  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, message, ...args);
  }

  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, message, ...args);
  }

  startTimer(label) {
    this.timers.set(label, Date.now());
  }

  endTimer(label) {
    const start = this.timers.get(label);
    if (start === undefined) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }
    const elapsed = Date.now() - start;
    this.info(`[${label}] completed in ${elapsed}ms`);
    this.timers.delete(label);
  }

  section(message) {
    const line = '='.repeat(60);
    console.log(`\n${line}`);
    console.log(`  ${message}`);
    console.log(`${line}\n`);
  }
}

module.exports = new Logger();
