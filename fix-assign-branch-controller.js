const fs = require('fs');
let content = fs.readFileSync('src/controllers/loanController.js', 'utf8');

content = content.replace(
  `module.exports = {`,
  `const assignBranch = async (req, res) => {
  try {
    const { branch_id } = req.body;
    if (!branch_id) return res.status(400).json({ error: 'branch_id required' });
    const result = await pool.query(
      'UPDATE loans SET branch_id = $1 WHERE id = $2 RETURNING id, branch_id',
      [branch_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Loan not found' });
    res.json({ message: 'Loan assigned to branch', loan: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = {`
);

content = content.replace(
  `getPendingLoans, getLoanSchedule };`,
  `getPendingLoans, getLoanSchedule, assignBranch };`
);

fs.writeFileSync('src/controllers/loanController.js', content, 'utf8');
console.log('✅ assignBranch added to loanController!');