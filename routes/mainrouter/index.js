var express = require("express");
var app = express();
const superApi = require("../superadmin/superapi");
const chatBot = require("../chatbot/chatbot");
const schdule = require("node-schedule");
const StartupController = require("./controller/StartupController.ts");
const LoginController = require("./controller/LoginController.ts");
const AdminLoginController = require("./controller/AdminLoginController.ts");
const MedicineController = require("./controller/MedicineController.ts");
const SettingsController = require("./controller/SettingsController");
const EcomCartController = require("./controller/EcommerceCartController");
const OrgLoginController = require("./controller/OrganizationLoginController.ts");
const EcomLoginController = require("./controller/EcommerceLoginController.ts");
const MailController = require("./controller/MailController.ts");
const PaymentController = require("./controller/PaymentController.ts");
const PasswordController = require("./controller/PasswordController.ts");
const LogOutController = require("./controller/LogOutController.ts");
const DelManController = require("./controller/DeliveryManController.ts");
const PharmacistController = require("./controller/PharmacistController.ts");
require("dotenv").config();

app.use(StartupController.useCors());

var connection = StartupController.getConnection();

var AllowedUrls = StartupController.getAllowedUrls();

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
  if (AllowedUrls.filter((url) => url == req.url).length > 0) {
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
app.post("/update-last-accessed", LoginController.updateLastAccessedScreen);
app.post("/check-username", LoginController.checkUserDuplicateDetails);
app.post("/logged-in", LoginController.isUserLoggedIn);
app.post("/login", LoginController.loginUser);
app.post("/new-user", LoginController.createNewUser);

//Medicine Controller
app.post("/get-medicines", MedicineController.getMedicines);
app.post("/post-medicine", MedicineController.postMedicines);
app.post("/get-search-medicines", MedicineController.getSearchMedicines);

//Settings Controller
app.post("/get-user-details", SettingsController.getUserDetails);
app.post("/update-user-details", SettingsController.updateUserDetails);

//Ecommerce Cart Controller
app.post("/get-cart-items", EcomCartController.getCartItems);
app.post("/get-cart-items-count", EcomCartController.getCartItemsCount);
app.post("/update-cart-items", EcomCartController.updateCartItems);
app.post("/delete-cart-items", EcomCartController.deleteCartItems);
app.post("/add-to-cart", EcomCartController.addToCart);

//Admin Login Controller
app.post("/get-users", AdminLoginController.getUsers);
app.post("/get-user-previleges", AdminLoginController.getUserPrevileges);
app.post("/update-user-previleges", AdminLoginController.updateUserPrevileges);

//Organization Login Controller
app.post("/get-dashboard-details", OrgLoginController.getDashboardDetails);
app.post("/get-reports", OrgLoginController.getReports);
app.post("/post-report", OrgLoginController.postReport);
app.post("/get-invoices", OrgLoginController.getInvoices);
app.post("/post-invoice", OrgLoginController.postInvoice);
app.post("/get-delivery-men-details", OrgLoginController.getDeliveryManDetails);
app.post(
  "/post-delivery-man-details",
  OrgLoginController.postDeliveryManDetail
);
app.post("/get-pharmacists-details", OrgLoginController.getPhamacistsDetails);
app.post("/post-pharmacist-details", OrgLoginController.postPharmacistDetails);
app.post("/get-managers", OrgLoginController.getManagers);
app.post("/post-new-manager", OrgLoginController.postManager);

//Pharmacist Controller
app.post("/approve-order", PharmacistController.approveOrder);
app.post("/decline-orders", PharmacistController.declineOrder);
app.post(
  "/get-ordered-items-for-approval",
  PharmacistController.getOrdersForApproval
);

//Delivery Man Controller
app.post("/get-approved-items", DelManController.getApprovedItems);
app.post("/pickup-order", DelManController.pickupOrder);
app.post("/get-delivery-orders", DelManController.getDeliveryOrders);

//Mail Controller
app.post("/security/verify-email", MailController.verifyEmail);
app.post("/security/generate-email", MailController.generateEmail);

//Password Controller
app.post("/update-pass", PasswordController.updatePassword);
app.post("/forgot-pass-change", PasswordController.forgotPasswordChange);

//LogOut Controller
app.post("/logout", LogOutController.logoutUser);

//Payment Controller
app.post("/make-order", PaymentController.makeOrder);
app.post("/payment/orders", PaymentController.purchaseCartItems);
app.post("/payment/success", PaymentController.paymentDone);
app.post("/payment/subscription", PaymentController.purchaseSubscriptionPlan);
app.post("/activate-subscription", PaymentController.activateSubscription);

module.exports = app;
