import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDocument, validateRecord} from '../workflow.mjs';

test('extracts exact labels without confusing subtotal or tax with the total', () => {
  const result = extractDocument('Supplier: Northfield Studio\nInvoice: INV-1042\nSubtotal: GBP 1000.00\nTax: GBP 200.00\nTotal: GBP 1,200.00');
  assert.deepEqual(result.fields, {supplier:'Northfield Studio',invoice:'INV-1042',amount:'1200.00',currency:'GBP'});
  assert.deepEqual(result.missing, []);
});

test('leaves missing or ambiguous values for human review', () => {
  assert.deepEqual(extractDocument('Supplier:\nInvoice: ES-091\nTotal: To be confirmed').missing,['supplier','amount','currency']);
  for (const total of ['GBP 1,20.00','GBP -20','GBP 0','GBP 12.345','GBP 12 USD','GBP 999999999999999999']) {
    assert.equal(extractDocument(`Supplier: Example\nInvoice: ES-091\nTotal: ${total}`).fields.amount,'',total);
  }
});

test('supports documented currencies and explicit currency symbols', () => {
  for (const [total, currency] of [['£1200.00','GBP'],['2450.50 USD','USD'],['EUR 250','EUR'],['€ 30.5','EUR'],['$45','USD']]) {
    const result = extractDocument(`supplier: Example\r\ninvoice: INV-01\r\ntotal: ${total}`);
    assert.equal(result.fields.currency,currency);
    assert.deepEqual(result.missing,[]);
  }
});

test('rejects empty and oversized documents', () => {
  assert.throws(() => extractDocument('   '), /document text/);
  assert.throws(() => extractDocument('a'.repeat(12001)), /12,000/);
});

test('validation requires approval and valid reviewed fields', () => {
  const fields = {supplier:' Example Services ',invoice:' ES-091 ',amount:'250',currency:'EUR'};
  assert.throws(() => validateRecord(fields,false), /approval/);
  assert.throws(() => validateRecord({...fields,amount:'-10'},true), /greater than zero/);
  assert.throws(() => validateRecord({...fields,currency:'AUD'},true), /GBP, USD or EUR/);
  assert.throws(() => validateRecord({...fields,supplier:'a'},true), /supplier/);
  assert.deepEqual(validateRecord(fields,true).record,{supplier:'Example Services',invoice:'ES-091',amount:'250.00',currency:'EUR',reviewed:true});
});
