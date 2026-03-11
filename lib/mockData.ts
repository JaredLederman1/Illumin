export const mockAccounts = [
  {
    id: 'acc_1',
    userId: 'user_1',
    institutionName: 'Charles Schwab',
    accountType: 'checking',
    balance: 12450.88,
    last4: '4821',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date(),
  },
  {
    id: 'acc_2',
    userId: 'user_1',
    institutionName: 'Charles Schwab',
    accountType: 'brokerage',
    balance: 84320.50,
    last4: '9102',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date(),
  },
  {
    id: 'acc_3',
    userId: 'user_1',
    institutionName: 'Capital One',
    accountType: 'credit',
    balance: -3240.15,
    last4: '7734',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date(),
  },
  {
    id: 'acc_4',
    userId: 'user_1',
    institutionName: 'Capital One',
    accountType: 'savings',
    balance: 18000.00,
    last4: '5519',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date(),
  },
]

export const mockTransactions = [
  { id: 't1', accountId: 'acc_1', merchantName: 'Whole Foods Market', amount: -124.32, category: 'Groceries', date: new Date('2026-03-08'), pending: false },
  { id: 't2', accountId: 'acc_1', merchantName: 'Direct Deposit - Employer', amount: 5200.00, category: 'Income', date: new Date('2026-03-07'), pending: false },
  { id: 't3', accountId: 'acc_3', merchantName: 'Netflix', amount: -15.99, category: 'Entertainment', date: new Date('2026-03-06'), pending: false },
  { id: 't4', accountId: 'acc_3', merchantName: 'Uber', amount: -28.40, category: 'Transport', date: new Date('2026-03-05'), pending: false },
  { id: 't5', accountId: 'acc_1', merchantName: 'Con Edison', amount: -98.12, category: 'Utilities', date: new Date('2026-03-04'), pending: false },
  { id: 't6', accountId: 'acc_3', merchantName: 'Amazon', amount: -67.99, category: 'Shopping', date: new Date('2026-03-03'), pending: false },
  { id: 't7', accountId: 'acc_1', merchantName: 'Starbucks', amount: -6.85, category: 'Dining', date: new Date('2026-03-02'), pending: false },
  { id: 't8', accountId: 'acc_3', merchantName: 'Spotify', amount: -9.99, category: 'Entertainment', date: new Date('2026-03-01'), pending: false },
  { id: 't9', accountId: 'acc_1', merchantName: 'CVS Pharmacy', amount: -23.45, category: 'Health', date: new Date('2026-02-28'), pending: false },
  { id: 't10', accountId: 'acc_3', merchantName: 'Chipotle', amount: -14.75, category: 'Dining', date: new Date('2026-02-27'), pending: false },
  { id: 't11', accountId: 'acc_1', merchantName: 'Direct Deposit - Employer', amount: 5200.00, category: 'Income', date: new Date('2026-02-21'), pending: false },
  { id: 't12', accountId: 'acc_3', merchantName: 'Trader Joe\'s', amount: -89.21, category: 'Groceries', date: new Date('2026-02-20'), pending: false },
  { id: 't13', accountId: 'acc_1', merchantName: 'Planet Fitness', amount: -24.99, category: 'Health', date: new Date('2026-02-15'), pending: false },
  { id: 't14', accountId: 'acc_3', merchantName: 'United Airlines', amount: -420.00, category: 'Travel', date: new Date('2026-02-10'), pending: false },
  { id: 't15', accountId: 'acc_1', merchantName: 'Sweetgreen', amount: -16.50, category: 'Dining', date: new Date('2026-02-09'), pending: false },
]

export const mockNetWorth = {
  current: 111531.23,
  lastMonth: 108240.00,
  totalAssets: 114771.38,
  totalLiabilities: 3240.15,
}

export const mockMonthlyData = [
  { month: 'Oct', income: 10400, expenses: 6820, savings: 3580 },
  { month: 'Nov', income: 10400, expenses: 7340, savings: 3060 },
  { month: 'Dec', income: 10400, expenses: 9120, savings: 1280 },
  { month: 'Jan', income: 10400, expenses: 6950, savings: 3450 },
  { month: 'Feb', income: 10400, expenses: 7480, savings: 2920 },
  { month: 'Mar', income: 10400, expenses: 4210, savings: 6190 },
]

export const mockSpendingByCategory = [
  { category: 'Groceries', amount: 213.53, color: '#c4a882' },
  { category: 'Dining', amount: 38.10, color: '#8aad78' },
  { category: 'Entertainment', amount: 25.98, color: '#7a6040' },
  { category: 'Transport', amount: 28.40, color: '#c4806a' },
  { category: 'Utilities', amount: 98.12, color: '#a08060' },
  { category: 'Shopping', amount: 67.99, color: '#6a8070' },
  { category: 'Health', amount: 48.44, color: '#9090a0' },
  { category: 'Travel', amount: 420.00, color: '#b08050' },
]
