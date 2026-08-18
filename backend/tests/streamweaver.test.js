const MappingStream = require('../src/streams/mapping.stream');
const JavascriptSandbox = require('../src/sandbox/javascript-sandbox');
const ValidationStream = require('../src/streams/validation.stream');
const mongoose = require('mongoose');

// Mock Mongoose Models
jest.mock('../src/models/job.model', () => ({
  updateOne: jest.fn().mockResolvedValue({ nModified: 1 })
}));

jest.mock('../src/models/error-record.model', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'mock-error-id' })
}));

describe('StreamWeaver ETL Unit Tests', () => {
  
  describe('MappingStream', () => {
    it('should map source columns to destination keys and discard unmapped fields', (done) => {
      const mappings = [
        { source: 'Col A', destination: 'name' },
        { source: 'Col B', destination: 'age' }
      ];
      
      const mappingStream = new MappingStream(mappings);
      const results = [];

      mappingStream.on('data', (data) => {
        results.push(data);
      });

      mappingStream.on('end', () => {
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ name: 'Alice', age: '28' });
        done();
      });

      mappingStream.write({
        'Col A': 'Alice',
        'Col B': '28',
        'Col C': 'SecretInfo'
      });
      mappingStream.end();
    });
  });

  describe('ValidationStream', () => {
    let mockJobId;

    beforeEach(() => {
      mockJobId = new mongoose.Types.ObjectId().toString();
      jest.clearAllMocks();
    });

    it('should pass valid data rows through', (done) => {
      const rules = [
        { field: 'name', required: true, type: 'string' },
        { field: 'age', required: true, type: 'number', min: 18 }
      ];

      const validationStream = new ValidationStream(mockJobId, rules);
      const results = [];

      validationStream.on('data', (data) => results.push(data));
      validationStream.on('end', () => {
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ name: 'Bob', age: 32 });
        done();
      });

      validationStream.write({ name: 'Bob', age: '32' });
      validationStream.end();
    });

    it('should filter out and log invalid rows without breaking the stream', (done) => {
      const rules = [
        { field: 'name', required: true, type: 'string' },
        { field: 'age', required: true, type: 'number', min: 18 }
      ];

      const validationStream = new ValidationStream(mockJobId, rules);
      const results = [];

      validationStream.on('data', (data) => results.push(data));
      validationStream.on('end', () => {
        expect(results).toHaveLength(1); // Only the second row is valid
        expect(results[0]).toEqual({ name: 'Charlie', age: 22 });
        done();
      });

      // Row 1: Invalid (age below 18)
      validationStream.write({ name: 'Kid', age: '12' });
      // Row 2: Valid
      validationStream.write({ name: 'Charlie', age: '22' });
      validationStream.end();
    });
  });

  describe('JavascriptSandbox (isolated-vm)', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new JavascriptSandbox();
    });

    afterEach(() => {
      sandbox.dispose();
    });

    it('should transform values correctly using custom javascript', () => {
      const key = 'test_uppercase';
      const code = 'return value.toUpperCase();';
      
      sandbox.compile(key, code);
      const result = sandbox.execute(key, 'hello world');
      
      expect(result).toBe('HELLO WORLD');
    });

    it('should handle strings trim and lowercase operations', () => {
      const key = 'test_trim_lower';
      const code = 'return value.trim().toLowerCase();';
      
      sandbox.compile(key, code);
      const result = sandbox.execute(key, '  SaMPlE   ');
      
      expect(result).toBe('sample');
    });

    it('should fail compilation on syntax errors', () => {
      const key = 'test_syntax_error';
      const code = 'return value.';
      
      expect(() => {
        sandbox.compile(key, code);
      }).toThrow(/Sandbox compilation failed/);
    });

    it('should fail execution on runtime errors inside the user script', () => {
      const key = 'test_runtime_error';
      const code = 'throw new Error("execution failed");';
      
      sandbox.compile(key, code);
      expect(() => {
        sandbox.execute(key, 'val');
      }).toThrow(/execution failed/);
    });

    it('should prevent user script from escaping the sandbox to access global process', () => {
      const key = 'test_escape';
      const code = 'return process.env;'; // process is undefined in Isolate
      
      sandbox.compile(key, code);
      expect(() => {
        sandbox.execute(key, 'val');
      }).toThrow(/process is not defined/);
    });

    it('should prevent infinite loops via timeout limits', () => {
      const key = 'test_infinite_loop';
      const code = 'while(true) {}';
      
      sandbox.compile(key, code);
      expect(() => {
        sandbox.execute(key, 'val');
      }).toThrow(/Script execution timed out/);
    });
  });
});
