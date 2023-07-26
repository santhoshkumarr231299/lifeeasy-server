var express = require("express");
var app = express();
const superApi = require("../superadmin/superapi");
const chatBot = require("../chatbot/chatbot");
const schdule = require("node-schedule");
require("dotenv").config();
const {
  getConnection,
  useCors,
  getAllowedUrls,
} = require("./controller/StartupController.ts");

const {
  checkUserDuplicateDetails,
  isUserLoggedIn,
  UpdateLastAccessedScreen,
  loginUser,
  createNewUser,
} = require("./controller/LoginController.ts");

const {
  getUsers,
  getUserPrevileges,
  updateUserPrevileges,
} = require("./controller/AdminLoginController.ts");
const {
  getMedicines,
  postMedicines,
  getSearchMedicines,
} = require("./controller/MedicineController.ts");
const {
  getUserDetails,
  updateUserDetails,
} = require("./controller/SettingsController");
const {
  getCartItems,
  getCartItemsCount,
  updateCartItems,
  deleteCartItems,
  addToCart,
} = require("./controller/EcommerceCartController");

const {
  getReports,
  postReport,
  getInvoices,
  postInvoice,
  getDeliveryManDetails,
  postDeliveryManDetail,
  getPhamacistsDetails,
  postPharmacistDetails,
  getManagers,
  postManager,
  getDashboardDetails,
} = require("./controller/OrganizationLoginController.ts");
const {} = require("./controller/EcommerceLoginController.ts");
const {
  verifyEmail,
  generateEmail,
} = require("./controller/MailController.ts");
const {
  makeOrder,
  purchaseCartItems,
  paymentDone,
  purchaseSubscriptionPlan,
  activateSubscription,
} = require("./controller/PaymentController.ts");
const {
  updatePassword,
  forgotPasswordChange,
} = require("./controller/PasswordController.ts");
const { logoutUser } = require("./controller/LogOutController.ts");
const {
  getApprovedItems,
  pickupOrder,
  getDeliveryOrders,
} = require("./controller/DeliveryManController.ts");
const {
  approveOrder,
  declineOrder,
  getOrdersForApproval,
} = require("./controller/PharmacistController.ts");

app.use(useCors());

var connection = getConnection();

var session = new Map();

var otpRecords = new Map();

app.use(
  process.env.CHAT_BASE_PATH,
  (req, res, next) => {
    req.session = session;
    req.db = connection;
    req.otpRecords = otpRecords;
    next();
  },
  chatBot
);
app.use(
  process.env.SUPER_API_BASE_PATH,
  (req, res, next) => {
    req.session = session;
    req.db = connection;
    req.otpRecords = otpRecords;
    next();
  },
  superApi
);

schdule.scheduleJob("0 * * * *", () => {
  // at 12.00 am
  console.log("Deleting OTP Records...");
  for (let entry of Object.entries(otpRecords)) {
    delete otpRecords[entry[0]];
  }
});

schdule.scheduleJob("0 3 * * *", () => {
  console.log("Deleting Sessions...");
  for (let keyValue of Object.entries(session)) {
    delete session[keyValue[0]];
  }
});

app.use(function (req, res, next) {
  if (getAllowedUrls().filter((url) => url == req.url).length > 0) {
    req.session = session;
    req.db = connection;
    req.otpRecords = otpRecords;
    next();
  } else if (
    req.headers.authorization &&
    session[req.headers.authorization] &&
    session[req.headers.authorization].username
  ) {
    req.session = session;
    req.db = connection;
    req.otpRecords = otpRecords;
    next();
  } else {
    res.status(403).send({
      status: "failed",
      message: "Unauthorized Content",
    });
  }
});

app.get("/", function (req, res) {
  res.send("You are not authorized...");
});

//Login Controller
app.post("/update-last-accessed", UpdateLastAccessedScreen);
app.post("/check-username", checkUserDuplicateDetails);
app.post("/logged-in", isUserLoggedIn);
app.post("/login", loginUser);
app.post("/new-user", createNewUser);

//Medicine Controller
app.post("/get-medicines", getMedicines);
app.post("/post-medicine", postMedicines);
app.post("/get-search-medicines", getSearchMedicines);

//Settings Controller
app.post("/get-user-details", getUserDetails);
app.post("/update-user-details", updateUserDetails);

//Ecommerce Cart Controller
app.post("/get-cart-items", getCartItems);
app.post("/get-cart-items-count", getCartItemsCount);
app.post("/update-cart-items", updateCartItems);
app.post("/delete-cart-items", deleteCartItems);
app.post("/add-to-cart", addToCart);

//Admin Login Controller
app.post("/get-users", getUsers);
app.post("/get-user-previleges", getUserPrevileges);
app.post("/update-user-previleges", updateUserPrevileges);

//Organization Login Controller
app.post("/get-dashboard-details", getDashboardDetails);
app.post("/get-reports", getReports);
app.post("/post-report", postReport);
app.post("/get-invoices", getInvoices);
app.post("/post-invoice", postInvoice);
app.post("/get-delivery-men-details", getDeliveryManDetails);
app.post("/post-delivery-man-details", postDeliveryManDetail);
app.post("/get-pharmacists-details", getPhamacistsDetails);
app.post("/post-pharmacist-details", postPharmacistDetails);
app.post("/get-managers", getManagers);
app.post("/post-new-manager", postManager);

//Pharmacist Controller
app.post("/approve-order", approveOrder);
app.post("/decline-orders", declineOrder);
app.post("/get-ordered-items-for-approval", getOrdersForApproval);

//Delivery Man Controller
app.post("/get-approved-items", getApprovedItems);
app.post("/pickup-order", pickupOrder);
app.post("/get-delivery-orders", getDeliveryOrders);

//Mail Controller
app.post("/security/verify-email", verifyEmail);
app.post("/security/generate-email", generateEmail);

//Password Controller
app.post("/update-pass", updatePassword);
app.post("/forgot-pass-change", forgotPasswordChange);

//LogOut Controller
app.post("/logout", logoutUser);

//Payment Controller
app.post("/make-order", makeOrder);
app.post("/payment/orders", purchaseCartItems);
app.post("/payment/success", paymentDone);
app.post("/payment/subscription", purchaseSubscriptionPlan);
app.post("/activate-subscription", activateSubscription);

module.exports = app;
