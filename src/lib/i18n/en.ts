export const en = {
  // Landing
  landing: {
    title: 'HWA Casino',
    subtitle: 'Private Members Only',
    code_placeholder: 'Enter your VIP code',
    verify_btn: 'Verify',
    verifying: 'Verifying...',
    invalid_code: 'Invalid, expired or already used code.',
    connection_error: 'Connection error. Please try again.',
    valid_code: 'Valid code!',
    welcome_chips: 'Your code gives you {chips} welcome chips!',
    create_account: 'Create My Account',
    already_member: 'Already a member? Sign in',
    back: '← Back',
    no_code: "Don't have a code? Contact your VIP host.",
  },
  // Register
  register: {
    title: 'Create Account',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    register_btn: 'Register',
    registering: 'Creating account...',
    min_password: 'Password must be at least 6 characters',
    fill_all: 'Please fill in all fields',
  },
  // Login
  login: {
    title: 'Sign In',
    email: 'Email',
    password: 'Password',
    login_btn: 'Sign In',
    logging_in: 'Signing in...',
    invalid_credentials: 'Invalid email or password',
  },
  // Dashboard
  dashboard: {
    vip_member: 'VIP Member',
    balance: 'Balance',
    exclusive_access: 'Exclusive Access',
    enter_games: 'Enter Games',
    my_wallet: 'My Wallet',
    deposit: 'Deposit',
    history: 'History',
    active_bonuses: 'Active Bonuses',
    welcome_bonus: 'Welcome Bonus',
    welcome_bonus_desc: 'Welcome chips credited',
    weekly_cashback: 'Weekly Cashback',
    weekly_cashback_desc: '5% of your weekly losses',
    active: 'Active',
    available: 'Available',
    sign_out: 'Sign Out',
    games: 'Games',
    wallet: 'Wallet',
    profile: 'Profile',
    home: 'Home',
  },
  // Games
  games: {
    select_game: 'Select Your Game',
    coming_soon: 'Coming Soon',
    live: 'Live',
    roulette_desc: 'European Roulette · Bets from 10 CHIPS',
  },
  // Roulette
  roulette: {
    spin: 'Spin',
    bet: 'Bet',
    clear: 'Clear',
    delete: 'Delete',
    double: 'Double',
    repeat: 'Repeat',
    waiting: 'Waiting',
    spinning: 'Spinning',
    closed: 'Closed',
    insufficient_balance: 'Insufficient balance',
    connection_error: 'Connection error',
    online_users: 'Online',
  },
  // Common
  common: {
    chips: 'Chips',
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
  }
}

export type Translations = typeof en
