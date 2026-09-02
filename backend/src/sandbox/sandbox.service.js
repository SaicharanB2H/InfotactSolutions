import vm from 'node:vm';
import { logger } from '../utils/logger.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { config } from '../config/env.js';

let ivm = null;
let useIvm = false;

// Attempt dynamic import of isolated-vm
try {
  ivm = (await import('isolated-vm')).default;
  useIvm = true;
  logger.info('isolated-vm initialized successfully for V8 sandbox execution');
} catch (err) {
  logger.warn('isolated-vm unavailable, falling back to node:vm sandbox engine with strict timeout controls');
  useIvm = false;
}

/**
 * Compiled Sandbox Executor class to optimize execution across millions of rows
 */
export class SandboxExecutor {
  constructor(code, options = {}) {
    this.code = code;
    this.timeout = options.timeout || config.sandboxTimeoutMs;
    this.memoryMb = options.memoryMb || config.sandboxMemoryMb;
    this.useIvm = useIvm;

    this.init();
  }

  init() {
    if (this.useIvm && ivm) {
      try {
        this.isolate = new ivm.Isolate({ memoryLimit: this.memoryMb });
        this.context = this.isolate.createContextSync();
        const jail = this.context.global;
        jail.setSync('global', jail.deref());
        
        // Wrapped function inside isolated-vm context
        const wrappedCode = `
          (function(value, row) {
            try {
              ${this.code}
            } catch (err) {
              throw new Error(err.message || String(err));
            }
          })
        `;
        this.script = this.isolate.compileScriptSync(wrappedCode);
        this.fn = this.script.runSync(this.context);
      } catch (err) {
        logger.warn(`Failed to initialize isolated-vm isolate: ${err.message}, falling back to node:vm`);
        this.useIvm = false;
        this.initVmScript();
      }
    } else {
      this.initVmScript();
    }
  }

  initVmScript() {
    const wrappedCode = `
      (function(value, row) {
        ${this.code}
      })(value, row)
    `;
    this.script = new vm.Script(wrappedCode, { filename: 'transformation.js' });
  }

  /**
   * Execute transformation for a single record field
   */
  execute(value, row = {}) {
    if (this.useIvm && this.fn) {
      try {
        const res = this.fn.applySync(undefined, [
          value !== undefined ? value : null,
          new ivm.ExternalCopy(row || {}).copyInto()
        ], { timeout: this.timeout });

        return res;
      } catch (err) {
        if (err.message && err.message.includes('Script execution timed out')) {
          throw new AppError(
            ERROR_CODES.TRANSFORMATION_TIMEOUT,
            `Sandbox transformation timed out (${this.timeout}ms)`,
            400
          );
        }
        throw new AppError(
          ERROR_CODES.TRANSFORMATION_ERROR,
          `Sandbox execution error: ${err.message}`,
          400
        );
      }
    } else {
      // Fallback using node:vm script execution with frozen context
      try {
        const sandboxContext = vm.createContext(Object.freeze({
          value: value !== undefined ? value : null,
          row: Object.freeze({ ...row }),
          Math: Object.freeze(Math),
          Number: Object.freeze(Number),
          String: Object.freeze(String),
          Boolean: Object.freeze(Boolean),
          Array: Object.freeze(Array),
          Object: Object.freeze(Object),
          JSON: Object.freeze(JSON),
          Date: Object.freeze(Date),
          RegExp: Object.freeze(RegExp)
        }));

        return this.script.runInContext(sandboxContext, {
          timeout: this.timeout
        });
      } catch (err) {
        if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message.includes('timed out')) {
          throw new AppError(
            ERROR_CODES.TRANSFORMATION_TIMEOUT,
            `Sandbox transformation timed out (${this.timeout}ms)`,
            400
          );
        }
        throw new AppError(
          ERROR_CODES.TRANSFORMATION_ERROR,
          `Sandbox execution error: ${err.message}`,
          400
        );
      }
    }
  }

  dispose() {
    if (this.isolate && !this.isolate.isDisposed) {
      try {
        this.isolate.dispose();
      } catch (e) {
        // ignore dispose errors
      }
    }
  }
}

/**
 * Creates an executor instance for code execution
 */
export function createSandboxExecutor(code, options = {}) {
  return new SandboxExecutor(code, options);
}
