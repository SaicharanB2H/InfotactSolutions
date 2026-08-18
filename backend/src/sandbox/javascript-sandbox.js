const ivm = require('isolated-vm');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * JavascriptSandbox runs user-defined transformation code inside a secure, resource-restricted V8 isolate.
 */
class JavascriptSandbox {
  constructor() {
    // Initialize isolate with 8MB heap limit
    this.isolate = new ivm.Isolate({ memoryLimit: 8 });
    this.context = this.isolate.createContextSync();
    
    const jail = this.context.global;
    // Set global pointer to itself to prevent jailbreaks
    jail.setSync('global', jail.derefInto());

    // Registry of compiled user functions: key -> JSReference
    this.compiledFunctions = new Map();
  }

  /**
   * Compiles user code into an anonymous function and caches it.
   * @param {string} key - Unique cache key (e.g., jobid_fieldname)
   * @param {string} userCode - User JS script (e.g., "return value.trim().toUpperCase();")
   */
  compile(key, userCode) {
    if (this.compiledFunctions.has(key)) {
      return;
    }

    try {
      // Wrap code as a self-returning anonymous function to keep global namespace clean
      const wrapped = `
        (function(value) {
          ${userCode}
        })
      `;

      const script = this.isolate.compileScriptSync(wrapped);
      const fn = script.runSync(this.context, { reference: true });

      if (typeof fn.applySync !== 'function') {
        throw new Error('User script did not return a valid function');
      }

      this.compiledFunctions.set(key, fn);
    } catch (error) {
      logger.error({ error, key }, 'Sandbox code compilation failed');
      throw new Error(`Sandbox compilation failed: ${error.message}`);
    }
  }

  /**
   * Executes a compiled function against an input value.
   * @param {string} key - Cache key of compiled function
   * @param {any} value - Argument to pass to user function
   * @returns {any} - The returned output of the user code
   */
  execute(key, value) {
    const fn = this.compiledFunctions.get(key);
    if (!fn) {
      throw new Error(`Function not found for key: ${key}`);
    }

    const timeout = config.SANDBOX_TIMEOUT_MS || 100;
    
    // We execute the function synchronously within the isolate, enforcing memory/timeout limits
    return fn.applySync(undefined, [value], { 
      timeout, 
      arguments: { copy: true }, 
      result: { copy: true } 
    });
  }

  /**
   * Disposes of the context, compiled functions, and the isolate to prevent V8 memory leaks.
   */
  dispose() {
    try {
      for (const fn of this.compiledFunctions.values()) {
        fn.release();
      }
      this.compiledFunctions.clear();
      this.context.release();
      this.isolate.dispose();
      logger.debug('Sandbox isolate disposed successfully');
    } catch (error) {
      logger.error({ error }, 'Error disposing sandbox isolate');
    }
  }
}

module.exports = JavascriptSandbox;
