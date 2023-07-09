const express = require('express')
const router = express.Router()

var session = new Map();

router.use(function (req,res,next) {
    if(session[req.headers.authorization] &&  session[req.headers.authorization].username && session[req.headers.authorization].username == 'santhosh') {
        next();
    }
    else {
        res.status(403).send({
            status : "failed",
            message : "You are not authorzied"
        });
    }
  })

router.get("/", (req, res) => {
    res.status(200).send({
        status : "success",
        message : "working"
    });
})



module.exports = router;