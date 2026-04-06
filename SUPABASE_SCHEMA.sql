-- REQUIRED SUPABASE TABLES

profiles:
- id (uuid)
- role (text: admin/user)
- email

bets:
- id
- user_id
- amount
- created_at
