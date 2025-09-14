export class Transaction {
  constructor(id, personId, amount, type, description = '', date = null) {
    this.id = id;
    this.personId = personId;
    this.amount = parseFloat(amount);
    this.type = type; // 'credit' (money given) or 'debit' (money taken)
    this.description = description;
    this.date = date || new Date().toISOString();
    this.createdAt = new Date().toISOString();
  }

  static fromJSON(json) {
    const transaction = new Transaction(
      json.id,
      json.personId,
      json.amount,
      json.type,
      json.description,
      json.date
    );
    transaction.createdAt = json.createdAt;
    return transaction;
  }

  toJSON() {
    return {
      id: this.id,
      personId: this.personId,
      amount: this.amount,
      type: this.type,
      description: this.description,
      date: this.date,
      createdAt: this.createdAt
    };
  }

  getFormattedAmount() {
    return `₹${this.amount.toFixed(2)}`;
  }

  getFormattedDate() {
    return new Date(this.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
