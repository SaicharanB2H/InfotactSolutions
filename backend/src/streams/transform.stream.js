import { Transform } from 'node:stream';
import { createSandboxExecutor } from '../sandbox/sandbox.service.js';
import { logger } from '../utils/logger.js';

/**
 * Streaming Transform Stage: Mappings & Sandbox Transformations
 */
export class StreamweaverTransform extends Transform {
  constructor({ mapping = {}, transformations = [], options = {} }) {
    super({ objectMode: true, ...options });

    // Map object entries
    this.mapping = mapping instanceof Map ? Object.fromEntries(mapping) : (mapping || {});
    this.transformations = transformations || [];
    this.rowCounter = 0;

    // Pre-compile sandbox executors once for the entire streaming run!
    this.executors = this.transformations.map((t) => {
      return {
        sourceField: t.sourceField,
        targetField: t.targetField,
        executor: createSandboxExecutor(t.code)
      };
    });
  }

  _transform(chunk, encoding, callback) {
    this.rowCounter++;
    const rowNumber = this.rowCounter;

    try {
      const mappedRecord = {};

      const mappingKeys = Object.keys(this.mapping);
      if (mappingKeys.length > 0) {
        // Apply column mapping (targetField -> sourceField)
        for (const [targetField, sourceField] of Object.entries(this.mapping)) {
          if (chunk[sourceField] !== undefined) {
            mappedRecord[targetField] = chunk[sourceField];
          } else if (chunk[targetField] !== undefined) {
            mappedRecord[targetField] = chunk[targetField];
          } else {
            mappedRecord[targetField] = null;
          }
        }
      } else {
        // Copy chunk as-is if no explicit mapping map provided
        Object.assign(mappedRecord, chunk);
      }

      // Apply sandbox JS transformations
      for (const item of this.executors) {
        const { sourceField, targetField, executor } = item;
        const valToTransform = mappedRecord[sourceField] !== undefined ? mappedRecord[sourceField] : chunk[sourceField];
        
        const transformedVal = executor.execute(valToTransform, mappedRecord);
        mappedRecord[targetField] = transformedVal;
      }

      this.push({
        rowNumber,
        originalData: chunk,
        mappedData: mappedRecord
      });

      callback();
    } catch (err) {
      // Push error packet so validation stage routes it to FailedRow
      this.push({
        rowNumber,
        originalData: chunk,
        mappedData: null,
        transformError: err.message || 'Transformation failed'
      });
      callback();
    }
  }

  _destroy(err, callback) {
    // Clean up compiled sandbox resources
    for (const item of this.executors) {
      if (item.executor && item.executor.dispose) {
        item.executor.dispose();
      }
    }
    callback(err);
  }
}

export function createTransformStream(config) {
  return new StreamweaverTransform(config);
}
