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
const StartupEntries = require("./../initialize/db-initializer/startup-entries.ts");
const AuthData = require("./data/auth-data.ts");
const AuthFilter = require("./filters/auth-filter.ts");
const FileUploadData = require("./data/file-upload-data.ts");
const twoFA = require("../authrouter/two-factor-auth.ts");
require("dotenv").config();

app.use(StartupController.useCors());

// Startup Entries
StartupEntries.initializeStartupEntries(StartupController.getConnection());

app.use(
  process.env.CHAT_BASE_PATH,
  (req, res, next) => {
    req.session = AuthData.getSessionData();
    req.db = StartupController.getConnection();
    req.otpRecords = AuthData.getOtpRecords();
    next();
  },
  chatBot
);
app.use(
  process.env.SUPER_API_BASE_PATH,
  (req, res, next) => {
    req.session = AuthData.getSessionData();
    req.db = StartupController.getConnection();
    req.otpRecords = AuthData.getOtpRecords();
    next();
  },
  superApi
);

app.use(
  "/2fa",
  (req, res, next) => {
    req.session = AuthData.getSessionData();
    req.db = StartupController.getConnection();
    req.otpRecords = AuthData.getOtpRecords();
    next();
  },
  twoFA
);

schdule.scheduleJob("0 * * * *", () => {
  // at 12.00 am
  console.log("Deleting OTP Records...");
  let otpRecords = AuthData.getOtpRecords();
  for (let entry of Object.entries(otpRecords)) {
    delete otpRecords[entry[0]];
  }
});

schdule.scheduleJob("0 3 * * *", () => {
  console.log("Deleting Sessions...");
  let session = AuthData.getSessionData();
  for (let keyValue of Object.entries(session)) {
    delete session[keyValue[0]];
  }
});


//filter
app.use(AuthFilter.checkAuth);

app.get("/", function (req, res) {
  res.send("You are not authorized...");
});

//Login Controller
app.post("/update-last-accessed", LoginController.updateLastAccessedScreen); // [all authenticated]
app.post("/check-username", LoginController.checkUserDuplicateDetails); // [open]
app.post("/logged-in", LoginController.isUserLoggedIn); // [open]
app.post("/login", LoginController.loginUser); // [open]
app.post("/new-user", LoginController.createNewUser); // [open]

//Medicine Controller
app.post("/get-medicines", MedicineController.getMedicines); // [4]
app.post("/post-medicine", MedicineController.postMedicines); // [4]
app.post("/medicine/upload", FileUploadData.medicineUpload.single('file'), MedicineController.uploadMedicineImage); // [4]
app.post("/get-search-medicines", MedicineController.getSearchMedicines); // [13]
app.get("/medicine-image", MedicineController.serveMedicineImage);// [open]

//Settings Controller
app.post("/get-user-details", SettingsController.getUserDetails); // [all authenticated]
app.post("/update-user-details", SettingsController.updateUserDetails); // [all authenticated]

//Ecommerce Cart Controller
app.post("/get-cart-items", EcomCartController.getCartItems); // [8]
app.post("/get-cart-items-count", EcomCartController.getCartItemsCount); // [8]
app.post("/update-cart-items", EcomCartController.updateCartItems); // [8]
app.post("/delete-cart-items", EcomCartController.deleteCartItems); // [8]
app.post("/add-to-cart", EcomCartController.addToCart); // [8]

//Admin Login Controller
app.post("/get-users", AdminLoginController.getUsers); // [10]
app.post("/get-user-previleges", AdminLoginController.getUserPrevileges); // [10]
app.post("/update-user-previleges", AdminLoginController.updateUserPrevileges); // [10]

//Organization Login Controller
app.post("/get-dashboard-details", OrgLoginController.getDashboardDetails); // [1]
app.post("/get-reports", OrgLoginController.getReports); // [9]
app.post("/post-report", OrgLoginController.postReport); // [9]
app.post("/get-invoices", OrgLoginController.getInvoices); // [2]
app.post("/post-invoice", OrgLoginController.postInvoice); // [2]
app.post("/get-delivery-men-details", OrgLoginController.getDeliveryManDetails); // [6]
app.post(
  "/post-delivery-man-details",
  OrgLoginController.postDeliveryManDetail
); // [6]
app.post("/get-pharmacists-details", OrgLoginController.getPhamacistsDetails); // [5]
app.post("/post-pharmacist-details", OrgLoginController.postPharmacistDetails); // [5]
app.post("/get-managers", OrgLoginController.getManagers); // [3]
app.post("/post-new-manager", OrgLoginController.postManager); // [3]

//Pharmacist Controller
app.post("/approve-order", PharmacistController.approveOrder); // [11]
app.post("/decline-orders", PharmacistController.declineOrder); // [11]
app.post(
  "/get-ordered-items-for-approval",
  PharmacistController.getOrdersForApproval
); // [11]

//Delivery Man Controller
app.post("/get-approved-items", DelManController.getApprovedItems); // [12]
app.post("/pickup-order", DelManController.pickupOrder); // [12]
app.post("/get-delivery-orders", DelManController.getDeliveryOrders); // [12]

//Mail Controller
app.post("/security/verify-email", MailController.verifyEmail); // [open]
app.post("/security/generate-email", MailController.generateEmail); // [open]

//Password Controller
app.post("/update-pass", PasswordController.updatePassword); // [all authenticated]
app.post("/forgot-pass-change", PasswordController.forgotPasswordChange); // [open]

//LogOut Controller
app.post("/logout", LogOutController.logoutUser); // [all authenticated]

//Payment Controller
app.post("/payment/orders", PaymentController.purchaseCartItems); // [8]
app.post("/payment/success", PaymentController.paymentDoneForCartPurchase); // [8]
app.post("/payment/subscription", PaymentController.purchaseSubscriptionPlan); // except [8] - added in all authticated (revaluate)
app.post("/payment/subscription/success", PaymentController.paymentDoneForSubscription); // except [8] - added in all authticated (revaluate)
app.post("/activate-free-trial", PaymentController.activateFreeTrial); // except [8] - added in all authticated (revaluate)

module.exports = app;
