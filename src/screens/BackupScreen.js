import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BackupService } from '../services/BackupService';
import DatabaseService from '../services/DatabaseService';

const BackupScreen = ({ navigation }) => {
  const [backupInfo, setBackupInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    try {
      // Ensure database is initialized before getting backup info
      await DatabaseService.init();
      const info = await BackupService.getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      console.error('Failed to load backup info:', error);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await BackupService.shareBackup();
      
      if (result.success) {
        Alert.alert('Success', 'Backup shared successfully! You can now send it via email, save to cloud storage, or share through any app.');
        await loadBackupInfo();
      } else {
        Alert.alert('Error', `Failed to share backup: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Backup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      Alert.alert(
        'Confirm Restore',
        'This will replace all current data with the backup file. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                const restoreResult = await BackupService.restoreFromEmail(result.assets[0].uri);
                
                if (restoreResult.success) {
                  Alert.alert('Success', 'Data restored successfully!');
                  await loadBackupInfo();
                  // Navigate back to dashboard to refresh data
                  navigation.navigate('Dashboard');
                } else {
                  Alert.alert('Error', `Restore failed: ${restoreResult.error}`);
                }
              } catch (error) {
                Alert.alert('Error', `Restore failed: ${error.message}`);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to select file: ${error.message}`);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all persons and transactions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Ensure database is initialized before clearing
              await DatabaseService.init();
              await DatabaseService.clearAllData();
              Alert.alert('Success', 'All data has been cleared.');
              await loadBackupInfo();
              navigation.navigate('Dashboard');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Error', `Failed to clear data: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>
        <Text style={styles.title}>Backup & Restore</Text>
      </View>

      <ScrollView style={styles.content}>
        {backupInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Current Data</Text>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#3498db" />
              <Text style={styles.infoText}>{backupInfo.personCount} Persons</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="swap-horizontal" size={20} color="#28a745" />
              <Text style={styles.infoText}>{backupInfo.transactionCount} Transactions</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#6c757d" />
              <Text style={styles.infoText}>
                Last export: {new Date(backupInfo.lastExport).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <Text style={styles.sectionDescription}>
            Create a backup of all your data and share it via email, cloud storage, or any other app.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.backupButton]}
            onPress={handleBackup}
            disabled={loading}
          >
            <Ionicons name="share" size={24} color="#ffffff" />
            <Text style={styles.buttonText}>Share Backup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore</Text>
          <Text style={styles.sectionDescription}>
            Restore your data from a previously created backup file.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={handleRestore}
            disabled={loading}
          >
            <Ionicons name="folder-open" size={24} color="#ffffff" />
            <Text style={styles.buttonText}>Restore from File</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <Text style={styles.sectionDescription}>
            Permanently delete all data. This action cannot be undone.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleClearData}
            disabled={loading}
          >
            <Ionicons name="trash" size={24} color="#ffffff" />
            <Text style={styles.buttonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backupButton: {
    backgroundColor: '#3498db',
  },
  restoreButton: {
    backgroundColor: '#28a745',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
});

export default BackupScreen;
