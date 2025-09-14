import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized && this.db) {
      console.log('Database already initialized');
      return this.db;
    }
    
    try {
      console.log('Initializing database...');
      this.db = await SQLite.openDatabaseAsync('money_management.db');
      console.log('Database opened successfully');
      await this.createTables();
      console.log('Tables created successfully');
      this.initialized = true;
      return this.db;
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.initialized = false;
      this.db = null;
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized || !this.db) {
      console.log('Database not initialized, initializing now...');
      try {
        await this.init();
        console.log('Database initialization completed in ensureInitialized');
      } catch (error) {
        console.error('Failed to initialize database in ensureInitialized:', error);
        throw error;
      }
    }
    
    if (!this.db) {
      throw new Error('Database instance is null after initialization');
    }
    
    return this.db;
  }

  async createTables() {
    try {
      console.log('Creating tables...');
      
      // Create persons table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS persons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          imageUri TEXT,
          createdAt TEXT NOT NULL
        );
      `);
      console.log('Persons table created');

      // Create transactions table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          personId TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
          description TEXT,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (personId) REFERENCES persons (id) ON DELETE CASCADE
        );
      `);
      console.log('Transactions table created');

      // Create indexes for better performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transactions_personId ON transactions(personId);
      `);
      console.log('PersonId index created');
      
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      `);
      console.log('Date index created');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Person CRUD operations
  async getPersons() {
    try {
      console.log('Getting persons...');
      const db = await this.ensureInitialized();
      console.log('Database instance:', db);
      const result = await db.getAllAsync('SELECT * FROM persons ORDER BY name ASC');
      console.log('Raw database result:', result);
      const persons = result.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        imageUri: row.imageUri,
        createdAt: row.createdAt
      }));
      console.log('Mapped persons:', persons);
      return persons;
    } catch (error) {
      console.error('Error getting persons:', error);
      return [];
    }
  }

  async savePerson(person) {
    try {
      console.log('Saving person:', person);
      const db = await this.ensureInitialized();
      const { id, name, phone, email, imageUri, createdAt } = person;
      
      console.log('Executing SQL for person:', { id, name, phone, email, imageUri, createdAt });
      
      const result = await db.runAsync(
        `INSERT OR REPLACE INTO persons (id, name, phone, email, imageUri, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, phone || null, email || null, imageUri || null, createdAt]
      );
      
      console.log('Person saved successfully:', result);
      return person;
    } catch (error) {
      console.error('Error saving person:', error);
      throw error;
    }
  }

  async deletePerson(personId) {
    try {
      const db = await this.ensureInitialized();
      await db.runAsync('DELETE FROM persons WHERE id = ?', [personId]);
    } catch (error) {
      console.error('Error deleting person:', error);
      throw error;
    }
  }

  // Transaction CRUD operations
  async getTransactions() {
    try {
      const db = await this.ensureInitialized();
      const result = await db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC');
      return result.map(row => ({
        id: row.id,
        personId: row.personId,
        amount: row.amount,
        type: row.type,
        description: row.description,
        date: row.date,
        createdAt: row.createdAt
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async getTransactionsByPersonId(personId) {
    try {
      const db = await this.ensureInitialized();
      const result = await db.getAllAsync(
        'SELECT * FROM transactions WHERE personId = ? ORDER BY date DESC',
        [personId]
      );
      return result.map(row => ({
        id: row.id,
        personId: row.personId,
        amount: row.amount,
        type: row.type,
        description: row.description,
        date: row.date,
        createdAt: row.createdAt
      }));
    } catch (error) {
      console.error('Error getting transactions by person ID:', error);
      return [];
    }
  }

  async saveTransaction(transaction) {
    try {
      const db = await this.ensureInitialized();
      const { id, personId, amount, type, description, date, createdAt } = transaction;
      
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions (id, personId, amount, type, description, date, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, personId, amount, type, description || null, date, createdAt]
      );
      
      return transaction;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(transactionId) {
    try {
      const db = await this.ensureInitialized();
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [transactionId]);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async deleteTransactionsByPersonId(personId) {
    try {
      const db = await this.ensureInitialized();
      await db.runAsync('DELETE FROM transactions WHERE personId = ?', [personId]);
    } catch (error) {
      console.error('Error deleting transactions by person ID:', error);
      throw error;
    }
  }

  // Utility functions
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  calculateBalance(transactions) {
    return transactions.reduce((balance, transaction) => {
      if (transaction.type === 'credit') {
        return balance + transaction.amount;
      } else {
        return balance - transaction.amount;
      }
    }, 0);
  }

  // Backup and restore functions
  async exportData() {
    const db = await this.ensureInitialized();
    const persons = await this.getPersons();
    const transactions = await this.getTransactions();
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      persons,
      transactions
    };
  }

  async importData(data) {
    const db = await this.ensureInitialized();
    
    try {
      await db.withTransactionAsync(async () => {
        // Clear existing data
        await db.runAsync('DELETE FROM transactions');
        await db.runAsync('DELETE FROM persons');
        
        // Import persons
        for (const person of data.persons) {
          await db.runAsync(
            `INSERT INTO persons (id, name, phone, email, imageUri, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [person.id, person.name, person.phone, person.email, person.imageUri, person.createdAt]
          );
        }
        
        // Import transactions
        for (const transaction of data.transactions) {
          await db.runAsync(
            `INSERT INTO transactions (id, personId, amount, type, description, date, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [transaction.id, transaction.personId, transaction.amount, transaction.type, 
             transaction.description, transaction.date, transaction.createdAt]
          );
        }
      });
      
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  async clearAllData() {
    const db = await this.ensureInitialized();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM transactions');
        await db.runAsync('DELETE FROM persons');
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

export default new DatabaseService();
