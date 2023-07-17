const {
  executeQueryController,
  authController,
} = require("./controller/SuperAdminController.ts");

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

router.post("/auth", authController);
router.post("/execute", executeQueryController);

module.exports = router;
