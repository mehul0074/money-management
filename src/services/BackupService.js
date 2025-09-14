import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import DatabaseService from './DatabaseService';

export class BackupService {
  static async createBackup() {
    try {
      const data = await DatabaseService.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create a temporary file
      const fileUri = FileSystem.documentDirectory + `money_manager_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      
      return {
        success: true,
        fileUri,
        data
      };
    } catch (error) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async shareBackup() {
    try {
      const backup = await this.createBackup();
      
      if (!backup.success) {
        throw new Error(backup.error);
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const result = await Sharing.shareAsync(backup.fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share Money Manager Backup',
        UTI: 'public.json'
      });
      
      return {
        success: result === 'shared',
        status: result
      };
    } catch (error) {
      console.error('Backup sharing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async restoreFromEmail(fileUri) {
    try {
      // Read the file
      const jsonString = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(jsonString);
      
      // Validate the data structure
      if (!data.persons || !data.transactions) {
        throw new Error('Invalid backup file format');
      }
      
      // Import the data
      const success = await DatabaseService.importData(data);
      
      return {
        success,
        data: success ? data : null
      };
    } catch (error) {
      console.error('Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getBackupInfo() {
    try {
      // Ensure database is initialized
      await DatabaseService.init();
      const data = await DatabaseService.exportData();
      return {
        personCount: data.persons.length,
        transactionCount: data.transactions.length,
        lastExport: data.exportDate,
        version: data.version
      };
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return {
        personCount: 0,
        transactionCount: 0,
        lastExport: new Date().toISOString(),
        version: '1.0.0'
      };
    }
  }
}
