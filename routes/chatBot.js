const express = require('express');
const router = express.Router();
require('dotenv').config();

// const socket = require('socket.io')(router, {
//   cors: {
//     origin: process.env.CLIENT_BASE_URL
//   }
// });

router.use(function (req,res,next) {
    console.log('working...');
  })


module.exports = router;