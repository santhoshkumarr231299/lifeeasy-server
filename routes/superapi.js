const express = require("express");
const router = express.Router();

const allowedUrlsWithoutAuth = [];

router.use(function (req, res, next) {
  if (allowedUrlsWithoutAuth.filter((url) => url == req.url).length > 0) {
    next();
  } else if (
    req.headers.authorization &&
    req.session[req.headers.authorization] &&
    req.session[req.headers.authorization].username ===
      process.env.ADMIN_USER_NAME
  ) {
    next();
  } else {
    res.status(403).send({
      status: "failed",
      message: "Unauthorized Content",
    });
  }
});

router.post("/auth", (req, res) => {
  res.status(200).send({
    status: "success",
    message: "Authenticated User",
  });
});

router.post("/execute", (req, res) => {
  res.status(200).send({
    status: "success",
    message: "Query Executed",
  });
});

module.exports = router;
