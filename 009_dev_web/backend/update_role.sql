UPDATE roles SET name='RiskAnalyst' WHERE name='READ_WRITE';
UPDATE userroles SET role_id = (SELECT id FROM roles WHERE name = 'RiskAnalyst') WHERE user_id = (SELECT id FROM users WHERE username = 'admin');
