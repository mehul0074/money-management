import DatabaseService from './DatabaseService';
import { Person } from '../models/Person';
import { Transaction } from '../models/Transaction';

export class StorageService {
  // Person CRUD operations
  static async getPersons() {
    try {
      const data = await DatabaseService.getPersons();
      return data.map(p => Person.fromJSON(p));
    } catch (error) {
      console.error('Error getting persons:', error);
      return [];
    }
  }

  static async savePerson(person) {
    try {
      await DatabaseService.savePerson(person.toJSON());
      return person;
    } catch (error) {
      console.error('Error saving person:', error);
      throw error;
    }
  }

  static async deletePerson(personId) {
    try {
      await DatabaseService.deletePerson(personId);
    } catch (error) {
      console.error('Error deleting person:', error);
      throw error;
    }
  }

  // Transaction CRUD operations
  static async getTransactions() {
    try {
      const data = await DatabaseService.getTransactions();
      return data.map(t => Transaction.fromJSON(t));
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  static async getTransactionsByPersonId(personId) {
    try {
      const data = await DatabaseService.getTransactionsByPersonId(personId);
      return data.map(t => Transaction.fromJSON(t));
    } catch (error) {
      console.error('Error getting transactions by person ID:', error);
      return [];
    }
  }

  static async saveTransaction(transaction) {
    try {
      await DatabaseService.saveTransaction(transaction.toJSON());
      return transaction;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  static async deleteTransaction(transactionId) {
    try {
      await DatabaseService.deleteTransaction(transactionId);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  static async deleteTransactionsByPersonId(personId) {
    try {
      await DatabaseService.deleteTransactionsByPersonId(personId);
    } catch (error) {
      console.error('Error deleting transactions by person ID:', error);
      throw error;
    }
  }

  // Utility functions
  static generateId() {
    return DatabaseService.generateId();
  }

  static calculateBalance(transactions) {
    return DatabaseService.calculateBalance(transactions);
  }
}
