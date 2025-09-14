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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StorageService } from '../services/StorageService';
import { Transaction } from '../models/Transaction';

const PersonDetailScreen = ({ route, navigation }) => {
  const { person } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'credit',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const loadTransactions = useCallback(async () => {
    try {
      const transactionsData = await StorageService.getTransactionsByPersonId(person.id);
      setTransactions(transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions');
    }
  }, [person.id]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'credit',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingTransaction(null);
    setShowDatePicker(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (transaction) => {
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      description: transaction.description,
      date: transaction.date.split('T')[0]
    });
    setEditingTransaction(transaction);
    setModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate.toISOString().split('T')[0] });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSave = async () => {
    if (!formData.amount.trim() || isNaN(parseFloat(formData.amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const transactionData = {
        ...formData,
        id: editingTransaction ? editingTransaction.id : StorageService.generateId(),
        personId: person.id,
        amount: parseFloat(formData.amount)
      };
      
      const transaction = new Transaction(
        transactionData.id,
        transactionData.personId,
        transactionData.amount,
        transactionData.type,
        transactionData.description.trim(),
        transactionData.date
      );

      await StorageService.saveTransaction(transaction);
      await loadTransactions();
      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const handleDelete = (transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteTransaction(transaction.id);
              await loadTransactions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  const calculateBalance = () => {
    return StorageService.calculateBalance(transactions);
  };

  const calculateTotals = () => {
    const creditTotal = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const debitTotal = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    return { creditTotal, debitTotal };
  };

  const renderTransactionItem = ({ item: transaction }) => (
    <TouchableOpacity
      style={[
        styles.transactionCard,
        transaction.type === 'credit' ? styles.creditCard : styles.debitCard
      ]}
      onPress={() => openEditModal(transaction)}
    >
      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionTypeContainer}>
            <Ionicons 
              name={transaction.type === 'credit' ? 'arrow-up-circle' : 'arrow-down-circle'} 
              size={20} 
              color={transaction.type === 'credit' ? '#28a745' : '#dc3545'} 
            />
            <Text style={styles.transactionType}>
              {transaction.type === 'credit' ? 'Given' : 'Taken'}
            </Text>
          </View>
        </View>
        {transaction.description && (
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
        )}
        <Text style={styles.transactionDate}>{transaction.getFormattedDate()}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          transaction.type === 'credit' ? styles.creditAmount : styles.debitAmount
        ]}>
          {transaction.type === 'credit' ? '+' : '-'}{transaction.getFormattedAmount()}
        </Text>
        <TouchableOpacity
          style={styles.deleteTransactionButton}
          onPress={() => handleDelete(transaction)}
        >
          <Ionicons name="trash-outline" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const balance = calculateBalance();
  const isPositive = balance >= 0;
  const { creditTotal, debitTotal } = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>
        <View style={styles.personInfo}>
          <View style={styles.personImageContainer}>
            {person.imageUri ? (
              <Image source={{ uri: person.imageUri }} style={styles.personImage} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#3498db" />
            )}
          </View>
          <View style={styles.personDetails}>
            <Text style={styles.personName}>{person.name}</Text>
            {person.phone && <Text style={styles.personPhone}>{person.phone}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[
            styles.balanceAmount,
            isPositive ? styles.positiveBalance : styles.negativeBalance
          ]}>
            {isPositive ? '+' : ''}₹{Math.abs(balance).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalsCard}>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-up-circle" size={16} color="#28a745" />
            <Text style={styles.totalLabel}>Given</Text>
            <Text style={styles.totalAmount}>₹{creditTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-down-circle" size={16} color="#dc3545" />
            <Text style={styles.totalLabel}>Taken</Text>
            <Text style={styles.totalAmount}>₹{debitTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transactions</Text>
        <TouchableOpacity style={styles.addTransactionButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={20} color="#ffffff" />
          <Text style={styles.addTransactionButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add a transaction</Text>
          </View>
        }
      />

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
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </Text>
            
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'credit' && styles.typeButtonActive
                ]}
                onPress={() => setFormData({ ...formData, type: 'credit' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  formData.type === 'credit' && styles.typeButtonTextActive
                ]}>
                  Money Given
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'debit' && styles.typeButtonActive
                ]}
                onPress={() => setFormData({ ...formData, type: 'debit' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  formData.type === 'debit' && styles.typeButtonTextActive
                ]}>
                  Money Taken
                </Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Amount *"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
            />
            
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateInputText}>
                {formatDate(formData.date)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6c757d" />
            </TouchableOpacity>

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

      {showDatePicker && (
        <DateTimePicker
          value={new Date(formData.date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
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
  personInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  personImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  personDetails: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  personPhone: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#28a745',
  },
  negativeBalance: {
    color: '#dc3545',
  },
  totalsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  totalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
    marginRight: 8,
    fontWeight: '500',
    flex: 1,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addTransactionButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addTransactionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  creditCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  debitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff8f8',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    marginBottom: 8,
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  creditAmount: {
    color: '#28a745',
  },
  debitAmount: {
    color: '#dc3545',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
    marginLeft: 28,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 28,
  },
  deleteTransactionButton: {
    backgroundColor: '#dc3545',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  typeButtonActive: {
    backgroundColor: '#28a745',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  typeButtonTextActive: {
    color: '#ffffff',
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#2c3e50',
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
});

export default PersonDetailScreen;
