# Money Management App

A React Native Expo app for tracking financial transactions between people.

## Features

### Person Management
- **Add Person**: Create new contacts with name, phone, and optional email
- **Edit Person**: Update existing person details
- **Delete Person**: Remove person and all their transactions
- **Person List**: View all persons on the main dashboard

### Transaction Management
- **Add Transaction**: Record money given or taken with amount, description, and date
- **Edit Transaction**: Modify existing transaction details
- **Delete Transaction**: Remove individual transactions
- **Transaction Types**:
  - **Money Given** (Credit): Money you lent to someone (Green color)
  - **Money Taken** (Debit): Money you borrowed from someone (Red color)

### Balance Tracking
- **Real-time Balance**: Shows current balance for each person
- **Visual Indicators**: Green for positive balance (you're owed), Red for negative (you owe)
- **Transaction History**: Chronological list of all transactions

## UI Features

### Color Scheme
- **Primary**: Dark blue (#2c3e50) for headers
- **Success**: Green (#27ae60) for money given/positive balance
- **Danger**: Red (#e74c3c) for money taken/negative balance
- **Info**: Blue (#3498db) for action buttons
- **Background**: Light gray (#f8f9fa) for main content

### Modern Design
- Card-based layout with shadows
- Rounded corners and clean typography
- Intuitive icons and color coding
- Responsive design for different screen sizes

## Technical Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **React Navigation**: Screen navigation
- **AsyncStorage**: Local data persistence
- **JavaScript ES6+**: Modern JavaScript features

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go app on your mobile device

## App Structure

```
src/
├── models/
│   ├── Person.js          # Person data model
│   └── Transaction.js     # Transaction data model
├── services/
│   └── StorageService.js  # Data persistence layer
├── screens/
│   ├── DashboardScreen.js    # Main dashboard with person list
│   └── PersonDetailScreen.js # Person details with transactions
└── navigation/
    └── AppNavigator.js    # Navigation configuration
```

## Usage

1. **Main Dashboard**: View all persons and add new ones
2. **Person Details**: Tap on a person to view their transactions and balance
3. **Add Transaction**: Use the + button to add money given/taken
4. **Edit/Delete**: Tap on transactions or use action buttons to modify data

The app automatically calculates and displays the current balance for each person, making it easy to track who owes what.
