import test from 'node:test';
import assert from 'node:assert/strict';
import { createSandboxExecutor } from '../src/sandbox/sandbox.service.js';

test('Sandbox Transformation Engine', async (t) => {
  await t.test('transforms string to uppercase correctly', () => {
    const executor = createSandboxExecutor('return value.toUpperCase();');
    const result = executor.execute('hello streamweaver');
    assert.equal(result, 'HELLO STREAMWEAVER');
  });

  await t.test('trims whitespace correctly', () => {
    const executor = createSandboxExecutor('return value.trim();');
    const result = executor.execute('   padded data   ');
    assert.equal(result, 'padded data');
  });

  await t.test('multiplies numbers correctly', () => {
    const executor = createSandboxExecutor('return Number(value) * 2;');
    const result = executor.execute(21);
    assert.equal(result, 42);
  });

  await t.test('handles row object context access', () => {
    const executor = createSandboxExecutor('return row.first + " " + row.last;');
    const result = executor.execute(null, { first: 'Ajay', last: 'Badhe' });
    assert.equal(result, 'Ajay Badhe');
  });

  await t.test('catches thrown runtime error inside sandbox code safely', () => {
    const executor = createSandboxExecutor('throw new Error("Custom JS Error");');
    assert.throws(() => {
      executor.execute('test');
    }, (err) => {
      return err.code === 'TRANSFORMATION_ERROR' && err.message.includes('Custom JS Error');
    });
  });

  await t.test('prevents infinite loops by enforcing execution timeout', () => {
    const executor = createSandboxExecutor('while(true) {}', { timeout: 50 });
    assert.throws(() => {
      executor.execute('test');
    }, (err) => {
      return err.code === 'TRANSFORMATION_TIMEOUT' || err.message.includes('timed out');
    });
  });
});
