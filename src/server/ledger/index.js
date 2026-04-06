const ledger = [];

export function addEntry(entry) {
  ledger.push({
    ...entry,
    timestamp: new Date().toISOString()
  });
}

export function getLedger() {
  return ledger;
}
