const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ msg: "URL route working" });
});

module.exports = router;
