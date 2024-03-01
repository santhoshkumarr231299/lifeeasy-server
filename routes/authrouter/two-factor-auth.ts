const express = require("express");
const router = express.Router();
const TwoFactorController = require("./controller/two-factor-controller.ts");
const TFAuthFilter = require("./filters/tfa-auth-filter.ts");

// Filter
router.use(TFAuthFilter.checkAuth);

router.post("/send-otp", TwoFactorController.sendOTP);
router.post("/verify-otp", TwoFactorController.verifyOTP);
router.get("/get-details", TwoFactorController.getUserDetailsForTFA)
router.post("/enable", TwoFactorController.configureTFA);
router.post("/disable", TwoFactorController.configureTFA);

module.exports = router;
