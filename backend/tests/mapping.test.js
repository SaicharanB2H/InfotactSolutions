import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord } from '../src/streams/validation.stream.js';
import { createTransformStream } from '../src/streams/transform.stream.js';

test('Mapping & Validation Engine', async (t) => {
  await t.test('validateRecord required and email rules', () => {
    const rules = {
      email: { required: true, type: 'email' },
      age: { type: 'number', min: 18 }
    };

    const validRecord = { email: 'test@example.com', age: 25 };
    const invalidRecord = { email: 'bad-email', age: 15 };

    assert.equal(validateRecord(validRecord, rules).length, 0);
    const errors = validateRecord(invalidRecord, rules);
    assert.equal(errors.length, 2);
  });

  await t.test('createTransformStream column mapping', async () => {
    const transformStream = createTransformStream({
      mapping: {
        firstName: 'Column A',
        emailAddress: 'Column B'
      }
    });

    const output = [];
    transformStream.on('data', (chunk) => output.push(chunk));

    transformStream.write({
      'Column A': 'John',
      'Column B': 'john@example.com',
      'Column C': 'Unmapped'
    });
    transformStream.end();

    await new Promise((resolve) => transformStream.on('end', resolve));

    assert.equal(output.length, 1);
    assert.equal(output[0].mappedData.firstName, 'John');
    assert.equal(output[0].mappedData.emailAddress, 'john@example.com');
  });
});
