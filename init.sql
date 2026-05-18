CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  national_id VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  term_months INTEGER NOT NULL,
  total_interest DECIMAL(12,2) NOT NULL,
  total_repayment DECIMAL(12,2) NOT NULL,
  monthly_payment DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_pricing_rules (
  rule_id SERIAL PRIMARY KEY,
  loan_amount DECIMAL(12,2) NOT NULL,
  term_weeks INTEGER NOT NULL,
  interest_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  UNIQUE (loan_amount, term_weeks)
);

INSERT INTO loan_pricing_rules (loan_amount, term_weeks, interest_amount, total_amount)
VALUES
(4000,6,2108,6108),
(5000,6,2650,7650),
(6000,6,1500,9000),
(7000,6,3020,10020),
(8000,6,3010,11010),
(9000,6,2000,12000),
(10000,4,2000,12000),
(10000,6,2167,13000);