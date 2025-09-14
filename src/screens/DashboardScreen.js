import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { StorageService } from '../services/StorageService';
import { Person } from '../models/Person';

const DashboardScreen = ({ navigation }) => {
  const [persons, setPersons] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    imageUri: null
  });

  const loadPersons = useCallback(async () => {
    try {
      console.log('Loading persons...');
      const personsData = await StorageService.getPersons();
      console.log('Persons data received:', personsData);
      
      // Load transaction data for each person
      const personsWithTransactions = await Promise.all(
        personsData.map(async (person) => {
          try {
            const transactions = await StorageService.getTransactionsByPersonId(person.id);
            
            // Calculate balance, given amount, taken amount, and last transaction date
            const balance = StorageService.calculateBalance(transactions);
            const givenAmount = transactions
              .filter(t => t.type === 'credit')
              .reduce((sum, t) => sum + t.amount, 0);
            const takenAmount = transactions
              .filter(t => t.type === 'debit')
              .reduce((sum, t) => sum + t.amount, 0);
            
            // Get last transaction date
            const lastTransaction = transactions.length > 0 
              ? transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
              : null;
            const lastTransactionDate = lastTransaction ? lastTransaction.date : null;
            
            return {
              ...person,
              balance,
              givenAmount,
              takenAmount,
              lastTransactionDate,
              transactionCount: transactions.length
            };
          } catch (error) {
            console.error(`Error loading transactions for person ${person.id}:`, error);
            return {
              ...person,
              balance: 0,
              givenAmount: 0,
              takenAmount: 0,
              lastTransactionDate: null,
              transactionCount: 0
            };
          }
        })
      );
      
      setPersons(personsWithTransactions);
      console.log('Persons with transactions loaded:', personsWithTransactions);
    } catch (error) {
      console.error('Load persons error:', error);
      Alert.alert('Error', `Failed to load persons: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPersons();
    setRefreshing(false);
  }, [loadPersons]);

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No transactions';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const calculateTotals = () => {
    const totals = persons.reduce((acc, person) => {
      acc.totalBalance += person.balance;
      acc.totalGiven += person.givenAmount;
      acc.totalTaken += person.takenAmount;
      return acc;
    }, { totalBalance: 0, totalGiven: 0, totalTaken: 0 });
    
    return totals;
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', imageUri: null });
    setEditingPerson(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (person) => {
    setFormData({
      name: person.name,
      phone: person.phone,
      email: person.email,
      imageUri: person.imageUri
    });
    setEditingPerson(person);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 200, height: 200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setFormData({ ...formData, imageUri: manipResult.uri });
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      console.log('Starting save process...');
      const personData = {
        ...formData,
        id: editingPerson ? editingPerson.id : StorageService.generateId()
      };
      
      console.log('Person data:', personData);
      
      const person = new Person(
        personData.id,
        personData.name.trim(),
        personData.phone.trim(),
        personData.email.trim(),
        personData.imageUri
      );

      console.log('Person object created:', person);
      console.log('Calling StorageService.savePerson...');
      
      await StorageService.savePerson(person);
      console.log('Person saved, reloading persons...');
      
      await loadPersons();
      console.log('Persons reloaded, closing modal...');
      
      setModalVisible(false);
      resetForm();
      console.log('Save process completed successfully');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', `Failed to save person: ${error.message}`);
    }
  };

  const handleDelete = (person) => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${person.name}? This will also delete all their transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deletePerson(person.id);
              await loadPersons();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete person');
            }
          }
        }
      ]
    );
  };

  const renderPersonItem = ({ item: person }) => (
    <TouchableOpacity
      style={styles.personCard}
      onPress={() => navigation.navigate('PersonDetail', { person })}
    >
      <View style={styles.personImageContainer}>
        {person.imageUri ? (
          <Image source={{ uri: person.imageUri }} style={styles.personImage} />
        ) : (
          <View style={[styles.avatarContainer, { backgroundColor: getAvatarColor(person.name) }]}>
            <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{person.name}</Text>
        
        <View style={styles.amountsRow}>
          <Text style={styles.givenAmount}>
            {formatCurrency(person.givenAmount)}
          </Text>
          <Text style={styles.takenAmount}>
            {formatCurrency(person.takenAmount)}
          </Text>
        </View>
        
        <View style={styles.lastTransactionRow}>
          <Ionicons name="time-outline" size={12} color="#6c757d" />
          <Text style={styles.lastTransactionText}>
            {formatDate(person.lastTransactionDate)}
          </Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={[
          styles.balanceAmount,
          { color: person.balance >= 0 ? '#28a745' : '#dc3545' }
        ]}>
          {formatCurrency(Math.abs(person.balance))}
        </Text>
        
        <View style={styles.personActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openEditModal(person)}
          >
            <Ionicons name="create-outline" size={14} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDelete(person)}
          >
            <Ionicons name="trash-outline" size={14} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="wallet" size={28} color="#2c3e50" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Money Manager</Text>
              <Text style={styles.subtitle}>Track your financial transactions</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.backupButton}
            onPress={() => navigation.navigate('Backup')}
          >
            <Ionicons name="cloud-upload" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={persons}
        keyExtractor={(item) => item.id}
        renderItem={renderPersonItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No persons added yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add someone</Text>
          </View>
        }
      />

      {/* Totals Section */}
      {persons.length > 0 && (
        <View style={styles.totalsContainer}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total Balance</Text>
            <Text style={[
              styles.totalAmount,
              { color: totals.totalBalance >= 0 ? '#28a745' : '#dc3545' }
            ]}>
              {formatCurrency(Math.abs(totals.totalBalance))}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total Given</Text>
            <Text style={styles.totalGivenAmount}>
              {formatCurrency(totals.totalGiven)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total Taken</Text>
            <Text style={styles.totalTakenAmount}>
              {formatCurrency(totals.totalTaken)}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {editingPerson ? 'Edit Person' : 'Add New Person'}
            </Text>
            
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {formData.imageUri ? (
                <Image source={{ uri: formData.imageUri }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#6c757d" />
                  <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  backupButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  personCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  personImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-left',    
    marginBottom: 8,
  },
  givenAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginRight: 15,
  },
  takenAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
  },
  lastTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastTransactionText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  personActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalGivenAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  totalTakenAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#28a745',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginLeft: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default DashboardScreen;
