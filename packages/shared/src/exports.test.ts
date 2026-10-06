import { describe, expect, it } from 'vitest';
import { columnsFor, metresNumber, toCsv } from './exports';

describe('ledger exports', () => {
  it('writes RFC 4180 CSV with a byte-order mark and guarded formulas', () => {
    const csv = toCsv(
      [
        { key: 'a', label: 'Order' },
        { key: 'b', label: 'Note, with comma' },
        { key: 'c', label: 'Metres', kind: 'number' },
      ],
      [
        { a: 'PO-26-0001', b: 'He said "fine"', c: 9400 },
        { a: '=SUM(A1)', b: null, c: 0 },
      ],
    );
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Order,"Note, with comma",Metres\r\n');
    expect(csv).toContain('PO-26-0001,"He said ""fine""",9400\r\n');
    expect(csv).toContain("'=SUM(A1),,0\r\n");
  });

  it('keeps cost columns for cost roles only', () => {
    expect(columnsFor('purchase-orders', 'qc').some((column) => column.key === 'amount')).toBe(false);
    expect(columnsFor('purchase-orders', 'finance').some((column) => column.key === 'amount')).toBe(true);
  });

  it('turns stored thousandths into spreadsheet numbers', () => {
    expect(metresNumber('6400000')).toBe(6400);
    expect(metresNumber(null)).toBeNull();
  });
});
