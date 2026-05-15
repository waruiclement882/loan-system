const express = require('express');

const router = express.Router();


// Test route
router.get('/', (req, res) => {
  res.json({
    message: 'M-Pesa routes working'
  });
});


module.exports = router;