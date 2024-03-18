const express = require("express");
const router = express.Router();
const IntegrationFilter = require("./filters/integration-auth-filter.ts");
const ChatAppController = require("./controller/ChatAppController.ts");

// Filter
router.use(IntegrationFilter.checkAuth);

router.post("/get-user-auth", ChatAppController.getUserAuth);

module.exports = router;
