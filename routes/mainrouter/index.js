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
} = require("./controller/LoginController.ts");

const {
  getUsers,
  getUserPrevileges,
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
    next();
  },
  chatBot
);
app.use(
  process.env.SUPER_API_BASE_PATH,
  (req, res, next) => {
    req.session = session;
    req.db = connection;
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
    next();
  } else if (
    req.headers.authorization &&
    session[req.headers.authorization] &&
    session[req.headers.authorization].username
  ) {
    req.session = session;
    req.db = connection;
    next();
  } else {
    res.status(403).send({
      status: "failed",
      message: "Unauthorized Content",
    });
  }
});

app.post("/check-username", checkUserDuplicateDetails);
app.post("/logged-in", isUserLoggedIn);

app.post("/login", (req, res) => {
  try {
    connection.query(
      "select * from users where username = ?  and status = 1",
      [req.body.username],
      async (err, result, fields) => {
        if (result && result.length == 1) {
          let username = result[0].username;
          let password = result[0].password;
          if (username == req.body.username) {
            if (await bcrypt.compare(req.body.password, password)) {
              const secretKey = uuidv4();
              var validatedUser = {
                username: result[0].username,
                role: result[0].role,
                lastAccessedScreen: result[0].last_accessed,
                pharmacy: result[0].pharmacy_name,
                subscriptionPack: result[0].subscription_pack,
                DateOfSubscription: result[0].date_of_subscription,
                message: "success",
              };
              session[secretKey] = validatedUser;
              console.log(`user logged in : `, validatedUser.username);
              res.setHeader(process.env.AUTH_NAME, secretKey);
              res.send(validatedUser);
            } else {
              res.status(200).send({
                username: "",
                role: "",
                lastAccessedScreen: 0,
                message: "failed",
                comment: "Username - Password Mismatch",
              });
            }
          } else {
            res.status(200).send({
              username: "",
              role: "",
              lastAccessedScreen: 0,
              message: "failed",
              comment: "Username does not Exist",
            });
          }
        } else {
          res.status(200).send({
            username: "",
            role: "",
            lastAccessedScreen: 0,
            message: "failed",
            comment: "Username does not Exist",
          });
        }
      }
    );
  } catch (e) {
    console.log("/login : ", e);
    res.status(200).send({
      username: "",
      role: "",
      lastAccessedScreen: 0,
      message: "failed",
      comment: "Failed to Login - try again later",
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

app.post("/logout", (req, res) => {
  try {
    delete session[req.headers.authorization];
  } catch (err) {}
  res.status(200).send({
    message: "success",
  });
});

app.get("/", function (req, res) {
  res.send("You are not authorized...");
});

//Login Controller
app.post("/update-last-accessed", UpdateLastAccessedScreen);

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

app.post("/update-pass", (req, res) => {
  connection.query(
    "select username, password, email from users where username = ?",
    [session[req.headers.authorization].username],
    async (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      }
      if (result.length == 0) {
        console.log(result);
        res.status(200).send({
          status: "warning",
          message: "User does not exist",
        });
      } else if (
        !(await bcrypt.compare(req.body.oldPass, result[0].password))
      ) {
        console.log(result);
        res.status(200).send({
          status: "warning",
          message: "Old Password Does Not Match",
        });
      } else {
        let email = result[0].email;
        if (req.body.oldPass === req.body.newPass) {
          res.status(200).send({
            status: "warning",
            message: "New Password and Old Password are same",
          });
        } else {
          const hashedPassword = await bcrypt.hash(req.body.newPass, 10);
          connection.query(
            "update users set password = ? where username = ?",
            [hashedPassword, session[req.headers.authorization].username],
            (err, result, fields) => {
              if (err) {
                res.status(200).send({
                  status: "error",
                  message: "Something went wrong",
                });
              } else {
                deleteUserSession(session[req.headers.authorization].username);
                var mailOptions = {
                  from: "PharmSimple <security-alert@pharmsimple.com>",
                  to: email,
                  subject: "Password Changed",
                  text: "The Password of Your Account has been Changed",
                };

                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log("Password changed : " + email);
                  }
                });
                res.status(200).send({
                  status: "success",
                  message: "New Password Updated Successfully",
                });
              }
            }
          );
        }
      }
    }
  );
});

app.post("/security/verify-email", (req, res) => {
  if (!req.body.email) {
    res.status(200).send({
      status: "error",
      message: "Email cannot be Empty",
    });
    return;
  }

  connection.query(
    "select email from users where email = ?",
    [req.body.email],
    (err, result, fields) => {
      if (!(!result || result.length === 0)) {
        res.status(200).send({
          status: "error",
          message: "Email already exists",
        });
        return;
      } else {
        let date = new Date();

        const secretKey = uuidv4();

        console.log(result);

        otpRecords[secretKey] = {
          mail: req.body.email,
          otp: Math.floor(Math.random() * 9000 + 1000).toString(),
          hour: date.getHours(),
          minute: date.getMinutes(),
        };

        var mailOptions = {
          from: "PharmSimple <security-alert@pharmsimple.com>",
          to: req.body.email,
          subject: "Verify Your Email",
          text:
            "PharmSimple Email Verfication OTP (valid for 5 minutes) : " +
            otpRecords[secretKey].otp,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.error(error);
            res.status(200).send({
              status: "error",
              message: "Enter a valid email",
            });
            return;
          } else {
            console.log("Email sent: " + req.body.email);
            res.setHeader(process.env.NEW_USER_AUTH_KEY, secretKey);
            res.status(200).send({
              status: "success",
              message: "OTP has been sent to the Mail if exists...",
            });
          }
        });
      }
    }
  );
});

app.post("/security/generate-email", (req, res) => {
  if (!req.body.username) {
    res.status(200).send({
      status: "error",
      message: "Username cannot be Empty",
    });
    return;
  }

  connection.query(
    "select email from users where username = ?",
    [req.body.username],
    (err, result, fields) => {
      if (!result || result.length === 0) {
        res.status(200).send({
          status: "error",
          message: "Username does not exists",
        });
        return;
      } else {
        let date = new Date();

        const secretKey = uuidv4();

        otpRecords[secretKey] = {
          username: req.body.username,
          mail: result[0].email,
          otp: Math.floor(Math.random() * 9000 + 1000).toString(),
          hour: date.getHours(),
          minute: date.getMinutes(),
        };

        var mailOptions = {
          from: "PharmSimple <security-alert@pharmsimple.com>",
          to: result[0].email,
          subject: "Verify Your Account",
          text:
            "PharmSimple Account Verfication OTP (valid for 5 minutes) : " +
            otpRecords[secretKey].otp,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            res.status(200).send({
              status: "error",
              message: "User does not have a valid email",
            });
            return;
          } else {
            console.log("Email sent: " + result[0].email);
            res.setHeader(process.env.FORGOT_PASS_CHANGE_AUTH, secretKey);
            res.status(200).send({
              status: "success",
              message: "OTP has been sent to the Associated Mail",
              // secretKey: secretKey,
            });
          }
        });
      }
    }
  );
});

app.post("/forgot-pass-change", async (req, res) => {
  try {
    let date = new Date();
    if (
      otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].minute >
      date.getMinutes()
    ) {
      if (
        date.getMinutes +
          (60 -
            otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]]
              .minute) >
        5
      ) {
        delete otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]];
        res.status(200).send({
          status: "error",
          message: "OTP expired",
        });
        return;
      }
    } else if (
      !req.headers[process.env.FORGOT_PASS_CHANGE_AUTH] ||
      !otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]]
    ) {
      delete otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]];
      res.status(200).send({
        status: "error",
        message: "OTP expired",
      });
      return;
    } else if (
      !otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]] ||
      !otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].mail
    ) {
      delete otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]];
      res.status(200).send({
        status: "error",
        message: "Verify your email...",
      });
      return;
    } else if (
      otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].minute <
      date.getMinutes()
    ) {
      if (
        date.getMinutes() -
          otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].minute >
        5
      ) {
        res.status(200).send({
          status: "error",
          message: "OTP expired",
        });
        return;
      }
    } else if (
      otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].otp !==
      req.body.otp
    ) {
      res.status(200).send({
        status: "error",
        message: "Invalid OTP",
      });
      return;
    } else {
      const hashedPassword = await bcrypt.hash(req.body.newPass, 10);
      connection.query(
        "update users set password = ? where username = ?",
        [
          hashedPassword,
          otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]].username,
        ],
        (err, result, fields) => {
          if (err) {
            console.error(err);
            res.status(200).send({
              status: "error",
              message: "Something went wrong",
            });
          } else {
            deleteUserSession(
              otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]]
                .username
            );

            var mailOptions = {
              from: "PharmSimple <security-alert@pharmsimple.com>",
              to: otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]]
                .mail,
              subject: "Security Alert",
              text: "Your PharmSimple Account Password has been Changed",
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                res.status(200).send({
                  status: "error",
                  message: "Enter a valid email",
                });
                return;
              } else {
                console.log("Email sent: " + info.response);
              }
            });

            delete otpRecords[req.headers[process.env.FORGOT_PASS_CHANGE_AUTH]];

            res.status(200).send({
              status: "success",
              message: "Password has been Changed",
            });
          }
        }
      );
    }
  } catch (err) {
    console.error(err);
    res.status(200).send({
      status: "error",
      message: "Something went wrong",
    });
  }
});

app.post("/get-reports", (req, res) => {
  connection.query(
    "select * from reports where username in (select u.username from users u where pharmacy_name = (select uu.pharmacy_name from users uu where username = ?)) order by reported_date desc",
    [session[req.headers.authorization].username],
    (err, result, fields) => {
      let data = [];
      let count = 1;
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      result.map((report) => {
        data.push({
          id: count++,
          reportTitle: report.report_title,
          reportSubject: report.report_subject,
          reportDesc: report.report_desc,
          reportDate: report.reported_date,
          reportedBy: report.username,
        });
      });
      res.status(200).send(data);
    }
  );
});

app.post("/post-report", (req, res) => {
  var queryParam = [
    session[req.headers.authorization].username,
    session[req.headers.authorization].role,
    req.body.reportTitle,
    req.body.reportSubject,
    req.body.reportDesc,
  ];
  connection.query(
    "insert into reports (username, role, report_title, report_subject, report_desc, reported_date) values (?,?,?,?,?,NOW())",
    queryParam,
    (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "New User Values Updated successfully",
        });
      }
    }
  );
});

app.post("/get-invoices", (req, res) => {
  connection.query(
    "select * from invoices where username = ? order by invoice_date desc",
    [session[req.headers.authorization].username],
    (err, result, fields) => {
      if (err) {
        console.log(err);
      }
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      let resp = [];
      result.map((data) => {
        resp.push({
          username: session[req.headers.authorization].username,
          pharmName: data.pharm_name,
          branch: data.branch,
          quantity: data.quantity,
          amount: data.amount,
          invoiceDate: data.invoice_date,
        });
      });
      res.status(200).send(resp);
    }
  );
});

app.post("/post-invoice", (req, res) => {
  var queryParam = [
    session[req.headers.authorization].username,
    req.body.pharmName,
    req.body.branch,
    req.body.quantity,
    req.body.amount,
  ];
  connection.query(
    "insert into invoices set username = ?, pharm_name = ?, branch = ?, quantity = ?, amount = ?, invoice_date = now()",
    queryParam,
    (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "New Invoice inserted successfully",
        });
      }
    }
  );
});

app.post("/get-delivery-men-details", (req, res) => {
  var query =
    "select * from delivery_men where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ? ))";
  connection.query(
    query,
    [session[req.headers.authorization].username],
    (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let respData = [];
        result.map((data) => {
          respData.push({
            name: data.username,
            email: data.email,
            mobileNumber: data.mobile_number,
            address: data.address,
            aadhar: data.aadhar_number,
          });
        });
        res.status(200).send(respData);
      }
    }
  );
});

app.post("/post-delivery-man-details", (req, res) => {
  var queryParam = [
    req.body.name,
    req.body.email,
    req.body.mobileNumber,
    req.body.address,
    req.body.aadhar,
    session[req.headers.authorization].username,
    session[req.headers.authorization].pharmacy,
  ];
  connection.query(
    "insert into delivery_men set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?, pharmacy_name = ?",
    queryParam,
    async (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        const hashedPassword = await bcrypt.hash("deliveryman", 10);
        var queryParam1 = [
          req.body.name,
          hashedPassword,
          req.body.mobileNumber,
          session[req.headers.authorization].username,
          req.body.email,
          session[req.headers.authorization].username,
          "[12]",
          session[req.headers.authorization].pharmacy,
          1,
          session[req.headers.authorization].pharmacy,
          1,
        ];
        connection.query(
          "insert into users set username = ?, password = ?, role = 6, last_accessed = 12,  mobile_number = ?,branch_id = (select u.branch_id from users u where u.username = ?), email = ?, pharmacy_name = (select u.pharmacy_name from users u where u.username = ?), have_access_to = ?, subscription_pack = (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), date_of_subscription = (select uuuu.date_of_subscription from users uuuu where pharmacy_name = ? and role = ?)",
          queryParam1,
          (err1, result1, fields1) => {
            if (err1) {
              console.log(err1);
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              res.status(200).send({
                status: "success",
                message: "New Delivery Man details inserted successfully",
              });
            }
          }
        );
      }
    }
  );
});

app.post("/get-pharmacists-details", (req, res) => {
  var query = "select * from pharmacists where added_by = ?";
  connection.query(
    query,
    [session[req.headers.authorization].username],
    (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let respData = [];
        result.map((data) => {
          respData.push({
            name: data.username,
            email: data.email,
            mobileNumber: data.mobile_number,
            address: data.address,
            aadhar: data.aadhar_number,
          });
        });
        res.status(200).send(respData);
      }
    }
  );
});

app.post("/post-pharmacist-details", (req, res) => {
  connection.query(
    "select count(*) as total from users where username = ?",
    [req.body.name],
    (err3, result3, fields3) => {
      if (err3) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else if (result3[0].total > 0) {
        res.status(200).send({
          status: "warning",
          message: "Username already exists",
        });
      } else {
        var queryParam = [
          req.body.name,
          req.body.email,
          req.body.mobileNumber,
          req.body.address,
          req.body.aadhar,
          session[req.headers.authorization].username,
          session[req.headers.authorization].pharmacy,
          1,
          session[req.headers.authorization].pharmacy,
          1,
        ];
        connection.query(
          "insert into pharmacists set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?",
          queryParam,
          async (err, result, fields) => {
            if (err) {
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              const hashedPassword = await bcrypt.hash("pharmacist", 10);
              var queryParam1 = [
                req.body.name,
                hashedPassword,
                3,
                11,
                req.body.email,
                session[req.headers.authorization].username,
                session[req.headers.authorization].username,
                req.body.mobileNumber,
                "[11]",
                session[req.headers.authorization].pharmacy,
                1,
                session[req.headers.authorization].pharmacy,
                1,
              ];
              connection.query(
                "insert into users (username, password, role,last_accessed, email,pharmacy_name,branch_id, mobile_number, have_access_to, subscription_pack, date_of_subscription) values (?,?,?,?,?,(select u.pharmacy_name from users u where username = ?),(select u.branch_id from users u where username = ?),?,?, (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), (select uuuu.date_of_subscription from users uuuu where pharmacy_name = ? and role = ?))",
                queryParam1,
                (err1, result1, fields1) => {
                  if (err1) {
                    console.log(err1);
                    res.status(200).send({
                      status: "error",
                      message: "Something went wrong",
                    });
                  } else {
                    res.status(200).send({
                      status: "success",
                      message: "New Pharmacist details inserted successfully",
                    });
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

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

// delete user session is made (so can't able make it to the controller) - Admin Login Controller
app.post("/update-user-previleges", (req, res) => {
  try {
    if (session[req.headers.authorization].role !== 1) {
      res.status(200).send({
        status: "error",
        message: "Authorization Failed",
      });
      return;
    }
    let query;
    let list;
    if (req.body.userStatus) {
      query =
        "update users set have_access_to = ?, last_accessed = ?, status = 1 where username = ?";
      list = [
        req.body.userPrevileges,
        req.body.lastAccessedScreen,
        req.body.username,
      ];
    } else {
      query = "update users set status = 0 where username = ?";
      list = [req.body.username];
    }
    connection.query(query, list, (err, result, fields) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!req.body.userStatus) {
          deleteUserSession(req.body.username);
        }
        res.status(200).send({
          status: "success",
          message: "User Previleges Updated successfully",
        });
      }
    });
  } catch (e) {
    console.error(e);
    res.status(200).send({
      status: "error",
      message: "Something went wrong",
    });
  }
});

app.post("/get-managers", (req, res) => {
  connection.query(
    "select * from managers where pharmacy_name = (select u.pharmacy_name from users u where u.username = ?) ",
    [session[req.headers.authorization].username],
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
        let data = [];
        result.forEach((element) => {
          data.push({
            username: element.username,
            email: element.email,
            branch: element.branch_id,
            address: element.address,
          });
        });
        res.status(200).send(data);
      }
    }
  );
});

// Admin Login Controller - password encryption using bcrypt
app.post("/post-new-manager", async (req, res) => {
  if (session[req.headers.authorization].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    });
    return;
  }
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  var queryParam1 = [
    req.body.username,
    hashedPassword,
    req.body.email,
    session[req.headers.authorization].username,
    req.body.branch,
    req.body.mobileNumber,
    session[req.headers.authorization].pharmacy,
    1,
    session[req.headers.authorization].pharmacy,
    1,
  ];
  connection.query(
    "insert into users (username, password, role, last_accessed,email,pharmacy_name, branch_id, mobile_number, have_access_to, subscription_pack, date_of_subscription) values (?,?,4,1,?,(select uuu.pharmacy_name from users uuu where uuu.username = ?),?, ?, '[1][2][4][6][7][9]', (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), (select uuuuu.date_of_subscription from users uuuuu where pharmacy_name = ? and role = ?))",
    queryParam1,
    (err1, result1, fields1) => {
      if (err1) {
        console.log(err1);
        res.status(200).send({
          status: "error",
          message: "Failed to insert Manager",
        });
      } else {
        var queryParam = [
          req.body.username,
          hashedPassword,
          req.body.email,
          req.body.username,
          req.body.address,
          session[req.headers.authorization].username,
        ];
        connection.query(
          "insert into managers (username, password, email, branch_id, address, pharmacy_name) values (?,?,?,(select u.branch_id from users u where u.username = ?),?, (select uuu.pharmacy_name from users uuu where uuu.username = ?))",
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
                message: "Manager details inserted successfully",
              });
            }
          }
        );
      }
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
