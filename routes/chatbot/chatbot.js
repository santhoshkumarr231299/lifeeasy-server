const express = require("express");
const router = express.Router();
require("dotenv").config();

router.use(function (req, res, next) {
  console.log("working...");
});

module.exports = router;
