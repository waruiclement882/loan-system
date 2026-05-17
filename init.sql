CREATE TABLE loan_pricing_rules (
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