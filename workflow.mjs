// A deterministic sample workflow. Document contents stay in the browser.
const currencies = new Set(['GBP', 'USD', 'EUR']);
const currencySymbols = { '£': 'GBP', '$': 'USD', '€': 'EUR' };
const amountPattern = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

function normalizeAmount(value) {
  const text = String(value ?? '').trim();
  if (!amountPattern.test(text)) return '';
  const amount = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER / 100) return '';
  return amount.toFixed(2);
}

export function extractDocument(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Add document text or choose a sample before extracting.');
  if (text.length > 12000) throw new Error('Keep the document text to 12,000 characters or fewer.');
  const line = label => text.match(new RegExp(`^\\s*${label}\\s*:[ \\t]*([^\\r\\n]*)`, 'im'))?.[1].trim() || '';
  const supplier = line('Supplier');
  const invoice = line('Invoice');
  const total = line('Total');
  const parts = total.match(/^(?:(GBP|USD|EUR|[£$€])\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?:\s*(GBP|USD|EUR|[£$€]))?$/i);
  const before = parts?.[1]?.toUpperCase();
  const after = parts?.[3]?.toUpperCase();
  const currency = value => currencySymbols[value] || value;
  const consistent = !before || !after || currency(before) === currency(after);
  const fields = {
    supplier: supplier.length >= 2 && supplier.length <= 150 ? supplier : '',
    invoice: invoice.length >= 2 && invoice.length <= 80 ? invoice : '',
    amount: parts && consistent ? normalizeAmount(parts[2]) : '',
    currency: consistent ? currency(before || after) || '' : ''
  };
  const missing = Object.keys(fields).filter(key => !fields[key]);
  return {
    fields,
    missing,
    message: missing.length
      ? 'Some information needs your attention. Complete the highlighted fields, then check the record against the document.'
      : 'Fields extracted. Check them against the document, then approve the record.'
  };
}

export function validateRecord(fields, approved) {
  if (approved !== true) throw new Error('Check the fields against the document and confirm your approval.');
  const supplier = String(fields.supplier ?? '').trim();
  const invoice = String(fields.invoice ?? '').trim();
  if (supplier.length < 2 || supplier.length > 150) throw new Error('Enter a supplier name between 2 and 150 characters.');
  if (invoice.length < 2 || invoice.length > 80) throw new Error('Enter an invoice number between 2 and 80 characters.');
  const amount = normalizeAmount(fields.amount);
  if (!amount) throw new Error('Enter a total greater than zero, using up to two decimal places.');
  if (!currencies.has(fields.currency)) throw new Error('Choose GBP, USD or EUR as the currency.');
  return {record: {supplier, invoice, amount, currency: fields.currency, reviewed: true}};
}
