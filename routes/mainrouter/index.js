var express = require("express");
var app = express();
const superApi = require("../superadmin/superapi");
const chatBot = require("../chatbot/chatbot");
const { v4: uuidv4 } = require("uuid");
const Razorpay = require("razorpay");
const schdule = require("node-schedule");
const bcrypt = require("bcrypt");
require("dotenv").config();
const {
  getTransporterData,
  getConnection,
  useCors,
  getAllowedUrls,
} = require("./controller/StartupController.ts");

const {
  checkUserDuplicateDetails,
  isUserLoggedIn,
  UpdateLastAccessedScreen,
  loginUser,
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
} = require("./controller/OrganizationLoginController.ts");
const {} = require("./controller/EcommerceLoginController.ts");
const {
  verifyEmail,
  generateEmail,
} = require("./controller/MailController.ts");
const {} = require("./controller/PaymentController.ts");
const {
  updatePassword,
  forgotPasswordChange,
} = require("./controller/PasswordController.ts");
const { logoutUser } = require("./controller/LogOutController.ts");

app.use(useCors());

var transporter = getTransporterData();

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

const deleteUserSession = (username) => {
  if (session) {
    for (const keyValue of Object.entries(session)) {
      if (session[keyValue[0]].username == username) {
        try {
          delete session[keyValue[0]];
        } catch (e) {
          console.error(e);
        }
      }
    }
    console.log("Session deleted for the User : ", username);
  }
};

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

app.post("/new-user", (req, res) => {
  connection.query(
    "select * from users where username = ?",
    [req.body.username],
    async (err, result, fields) => {
      let date = new Date();
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "danger",
          message: "Something went wrong",
        });
        return;
      } else if (result.length > 0) {
        res.status(200).send({
          status: "danger",
          message: "Username already exists",
        });
        return;
      } else if (
        !otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]] ||
        !otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].mail
      ) {
        console.error("otp not found");
        res.status(200).send({
          status: "error",
          message: "Verify your email...",
        });
        return;
      } else if (
        otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].mail !==
        req.body.email
      ) {
        console.error("email is not the same");
        delete otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]];
        res.status(200).send({
          status: "error",
          message: "Email Mismatch...",
        });
        return;
      } else if (
        otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].minute >
        date.getMinutes()
      ) {
        if (
          date.getMinutes +
            (60 -
              otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].minute) >
          5
        ) {
          delete otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]];
          res.status(200).send({
            status: "error",
            message: "OTP expired",
          });
          return;
        }
      } else if (
        otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].minute <
        date.getMinutes()
      ) {
        if (
          date.getMinutes() -
            otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].minute >
          5
        ) {
          delete otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]];
          res.status(200).send({
            status: "error",
            message: "OTP expired",
          });
          return;
        }
      } else if (
        otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]].otp !==
        req.body.otp
      ) {
        res.status(200).send({
          status: "error",
          message: "Invalid OTP",
        });
        return;
      } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        connection.query(
          "insert into users (username, password, role, last_accessed,email,mobile_number, pharmacy_name,branch_id,have_access_to) values (?,?,?,?,?,?,?,?,?)",
          [
            req.body.username,
            hashedPassword,
            req.body.pharmacyName && req.body.pharmacyName.trim() !== ""
              ? 1
              : 2,
            req.body.pharmacyName && req.body.pharmacyName.trim() !== ""
              ? 1
              : 8,
            req.body.email,
            req.body.mobileNumber,
            req.body.pharmacyName,
            req.body.pharmacyName && req.body.pharmacyName.trim() !== ""
              ? 1
              : -1,
            req.body.pharmacyName && req.body.pharmacyName.trim() !== ""
              ? "[1][2][3][4][5][6][7][9][10]"
              : "[8]",
          ],
          (err1, result1, fields1) => {
            if (err1) {
              console.log(err1);
              res.status(200).send({
                status: "danger",
                message: "Something went wrong",
              });
            } else {
              try {
                var mailOptions = {
                  from: "PharmSimple <security-alert@pharmsimple.com>",
                  to: otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]]
                    .mail,
                  subject: "Congratulations",
                  text:
                    "Your PharmSimple " +
                    (req.body.pharmacyName === "" ? "" : "Management ") +
                    "Account has been Created Successfully",
                };

                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    res.status(200).send({
                      status: "error",
                      message: "Enter a valid email",
                    });
                    return;
                  } else {
                    console.log("Email sent: " + req.body.email);
                  }
                });

                delete otpRecords[req.headers[process.env.NEW_USER_AUTH_KEY]];

                res.status(200).send({
                  status: "success",
                  message: "New User Created",
                });
              } catch (ex) {
                console.log("Exception while creating new user", ex);
                res.status(200).send({
                  status: "error",
                  message: "Something went wrong",
                });
              }
            }
          }
        );
      }
    }
  );
});

app.get("/", function (req, res) {
  res.send("You are not authorized...");
});

//Login Controller
app.post("/update-last-accessed", UpdateLastAccessedScreen);
app.post("/check-username", checkUserDuplicateDetails);
app.post("/logged-in", isUserLoggedIn);
app.post("/login", loginUser);

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

//Mail Controller
app.post("/security/verify-email", verifyEmail);
app.post("/security/generate-email", generateEmail);

//Password Controller
app.post("/update-pass", updatePassword);
app.post("/forgot-pass-change", forgotPasswordChange);

//LogOut Controller
app.post("/logout", logoutUser);

app.get("/get-created-pharmacies", (req, res) => {
  connection.query(
    "select distinct pharmacy_name from users order by pharmacy_name asc",
    (err, result, fields) => {
      let list = [];
      result.map((data) => {
        list.push(data.pharmacy_name);
      });
      res.status(200).send({
        status: "success",
        pharmacies: list,
      });
    }
  );
});

app.post("/get-dashboard-details", (req, res) => {
  connection.query(
    "select (select count(*) from managers where pharmacy_name = (select u.pharmacy_name from users u where username = ?)) as managers_count, (select count(*) from pharmacists where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ?))) as pharmacists_count, (select count(*) from delivery_men where pharmacy_name = ?) as delivery_men_count, (select count(*) from medicines where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ?))) as medicines_count",
    [
      session[req.headers.authorization].username,
      session[req.headers.authorization].username,
      session[req.headers.authorization].pharmacy,
      session[req.headers.authorization].username,
    ],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send({
            managersCount: 0,
            pharmacistsCount: 0,
            DeliveryMenCount: 0,
            medicinesCount: 0,
          });
          return;
        }
        res.status(200).send({
          managersCount: result[0].managers_count,
          pharmacistsCount: result[0].pharmacists_count,
          DeliveryMenCount: result[0].delivery_men_count,
          medicinesCount: result[0].medicines_count,
        });
      }
    }
  );
});

app.post("/get-ordered-items-for-approval", (req, res) => {
  connection.query(
    "select * from cartitems where is_ordered = 1 and pharm_name = ?",
    [session[req.headers.authorization].pharmacy],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let temp = [];
        result.forEach((element) => {
          temp.push({
            username: element.username,
            mid: element.mid,
            mname: element.medname,
            quantity: element.quantity,
          });
        });
        res.status(200).send(temp);
      }
    }
  );
});

app.post("/approve-order", (req, res) => {
  var queryParam1 = [req.body.username, req.body.mname, req.body.mid];
  connection.query(
    "insert into approved_items (mid, username, medname, quantity,price, pharmacy_name) select ci.mid, ci.username, ci.medname, ci.quantity, ci.price, ci.pharm_name from cartitems ci where username = ? and medname = ? and mid = ? and is_ordered = 1",
    queryParam1,
    (err1, result1, fields1) => {
      if (err1) {
        console.log(err1);
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        var queryParam = [req.body.username, req.body.mname, req.body.mid];
        connection.query(
          "delete from cartitems where username = ? and medname = ? and mid = ?",
          queryParam,
          (err, result, fields) => {
            if (err) {
              console.log(err);
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              res.status(200).send({
                status: "success",
                message: "Order Approved",
              });
            }
          }
        );
      }
    }
  );
});

app.post("/decline-orders", (req, res) => {
  if (session[req.headers.authorization].role !== 3) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    });
    return;
  } else {
    connection.query(
      "update cartitems set is_ordered = 2 where username = ? and is_ordered = 1 and mid = ? and medname = ?",
      [req.body.username, req.body.mid, req.body.mname],
      (err, result, fields) => {
        if (err) {
          console.log(err);
          res.status(200).send({
            status: "error",
            message: "Something went Wrong",
          });
        } else if (result.changedRows == 0) {
          res.status(200).send({
            status: "warning",
            message: "The medicine does not exist...",
          });
        } else {
          res.status(200).send({
            status: "success",
            message: "Declined Successfully",
          });
        }
      }
    );
  }
});

app.post("/make-order", (req, res) => {
  connection.query(
    "update cartitems set is_ordered = 1 where username = ? and is_ordered = 0",
    [session[req.headers.authorization].username],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "Ordered Successfully",
        });
      }
    }
  );
});

app.post("/get-approved-items", (req, res) => {
  connection.query(
    "select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0",
    ["NOT_ALLOCATED", session[req.headers.authorization].pharmacy],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let temp = [];
        result.forEach((element) => {
          temp.push({
            username: element.username,
            mname: element.medname,
            quantity: element.quantity,
            mobileNumber: element.mobile_number,
          });
        });
        res.status(200).send(temp);
      }
    }
  );
});

app.post("/pickup-order", (req, res) => {
  connection.query(
    "update approved_items set delivery_man = ? where username = ? and medname = ? and pharmacy_name = ?",
    [
      session[req.headers.authorization].username,
      req.body.username,
      req.body.medName,
      session[req.headers.authorization].pharmacy,
    ],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: `Picked Up ${req.body.medName}`,
        });
      }
    }
  );
});

app.post("/get-orders", (req, res) => {
  connection.query(
    "select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0",
    [
      session[req.headers.authorization].username,
      session[req.headers.authorization].pharmacy,
    ],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let temp = [];
        result.forEach((element) => {
          temp.push({
            username: element.username,
            mname: element.medname,
            quantity: element.quantity,
            mobileNumber: element.mobile_number,
          });
        });
        res.status(200).send(temp);
      }
    }
  );
});

app.post("/payment/orders", async (req, res) => {
  console.log("username : ", session[req.headers.authorization].username);
  connection.query(
    "select medname, quantity, price from cartitems where username = ? and is_ordered = 0",
    [session[req.headers.authorization].username],
    async (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(500).send("Some error occured");
      } else {
        if (!result || result.length === 0) {
          res.status(200).send("Cart is Empty");
          return;
        } else {
          let totalPay = 0;
          result.forEach((data) => (totalPay += +data.quantity * +data.price));
          try {
            const instance = new Razorpay({
              key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
              key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
            });

            const options = {
              amount: totalPay * 100,
              currency: "INR",
              receipt: "receipt_order_74394",
            };

            const order = await instance.orders.create(options);

            if (!order) return res.status(500).send("Some error occured");

            res.json(order);
          } catch (error) {
            console.log("error", error);
            res.status(500).send(error);
          }
        }
      }
    }
  );
});

app.post("/payment/success", (req, res) => {
  console.log("Payment successfull : " + req.body.razorpayPaymentId);
  res.send({
    status: "success",
    message: "Payment successful",
  });
});

app.post("/payment/subscription", async (req, res) => {
  let totalPay = req.body.subscriptionType == "monthly" ? 10 : 100;
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
      key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
    });

    const options = {
      amount: totalPay * 100,
      currency: "INR",
      receipt: "receipt_order_74394",
    };

    const order = await instance.orders.create(options);

    if (!order) return res.status(500).send("Some error occured");

    res.json(order);
  } catch (error) {
    console.log("error", error);
    res.status(500).send(error);
  }
});

app.post("/activate-subscription", (req, res) => {
  connection.query(
    "update users set subscription_pack = ?, date_of_subscription = now() where pharmacy_name = ?",
    [req.body.subscriptionType, session[req.headers.authorization].pharmacy],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(500).send({
          status: "failed",
          message: "Some error occured",
        });
      } else {
        res.send({
          status: "success",
          message: `Subscription Activated : ${
            req.body.subscriptionType[0].toUpperCase() +
            req.body.subscriptionType.substring(1)
          }`,
        });
      }
    }
  );
});

module.exports = app;
