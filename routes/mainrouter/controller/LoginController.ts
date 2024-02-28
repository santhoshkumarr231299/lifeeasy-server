const CommonUtil = require("../../util/CommonUtil.ts");
const StartupController = require("./StartupController.ts");
const bcrypt = require("bcrypt");
const AuthUtil = require("./../../util/AuthUtil.ts");
const Validator = require("../../util/validators.ts");

const transporter = StartupController.getTransporterData();

function checkUserDuplicateDetails(req: any, res: any) {
  try {
    let connection = req.db;
    connection.query(
      "select (select count(username) from users where username = ?) as username_count, (select count(email) from users where email = ?) as email_count, (select count(mobile_number) from users where mobile_number = ?) as mobile_number_count",
      [req.body.username, req.body.email, req.body.mobileNumber],
      (err: any, result: any, fields: any) => {
        if (
          !result ||
          (+result[0].username_count === 0 &&
            +result[0].email_count === 0 &&
            +result[0].mobile_number_count === 0)
        ) {
          res.status(200).send({
            status: "success",
            message: "Details not found",
          });
          return;
        } else if (+result[0].username_count > 0) {
          res.status(200).send({
            status: "warning",
            message: "Username already exists...",
          });
          return;
        } else if (+result[0].email_count > 0) {
          res.status(200).send({
            status: "warning",
            message: "Email already exists...",
          });
          return;
        } else if (+result[0].mobile_number_count > 0) {
          res.status(200).send({
            status: "warning",
            message: "Mobile Number already exists...",
          });
          return;
        } else {
          res.status(200).send({
            status: "success",
            message: "Details not found",
          });
          return;
        }
      }
    );
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status: "error",
      message: "Something went wrong",
    });
  }
}

function isUserLoggedIn(req: any, res: any) {
  try {
    let connection = req.db;
    let session = req.session;
    if (
      CommonUtil.isUndefined(req.headers.authorization) ||
      CommonUtil.isUndefined(session[req.headers.authorization])
    ) {
      res.status(200).send({});
    } else {
      connection.query(
        "select * from users where username = ?  and status = 1",
        [
          session[req.headers.authorization].username,
          session[req.headers.authorization].pharmacy,
        ],
        (err: any, result: any, fields: any) => {
          if (result && result.length === 1) {
            res.status(200).send({
              username: session[req.headers.authorization].username,
              role: session[req.headers.authorization].role,
              lastAccessedScreen: result[0].last_accessed,
              haveAccessTo: result[0].have_access_to,
              pharmacy: session[req.headers.authorization].pharmacy,
              subscriptionPack: result[0].subscription_pack,
              DateOfSubscription: result[0].date_of_subscription,
              isTFAEnabled :  session[req.headers.authorization].isTFAEnabled,
              isTFAVerified : session[req.headers.authorization].isTFAVerified,
            });
          } else {
            res.status(200).send({});
          }
        }
      );
    }
  } catch (e) {
    console.log(e);
    res.status(200).send({});
  }
}

function updateLastAccessedScreen(req: any, res: any) {
  try {
    let lastAccessedScreen : number = req.body.lastAccessedScreen;
    let session = req.session;
    let connection = req.db;

    if(!session[req.headers.authorization].haveAccessTo.includes(lastAccessedScreen)) {
      res.send({ message: "failed" });
      return;
    }

    connection.query(
      "update users set last_accessed = ? where username = ? and pharmacy_name = ?",
      [
        lastAccessedScreen,
        session[req.headers.authorization].username,
        session[req.headers.authorization].pharmacy,
      ],
      (err: any, result: any, fields: any) => {
        res.send({ message: "success" });
      }
    );
  } catch(e) {
    res.send({ message: "failed" });
  }
}

async function loginUser(req: any, res: any) {
  try {
    let connection = req.db;
    let session = req.session;
    if (
      CommonUtil.isUndefined(req.headers.authorization) ||
      CommonUtil.isUndefined(session[req.headers.authorization])
    ) {
      connection.query(
        "select u.username as u_username, password, have_access_to, role, last_accessed, pharmacy_name, subscription_pack, date_of_subscription, two_fa_enabled from users u left join user_auth ua on u.username = ua.username where u.username = ? and status = 1",
        [req.body.username],
        async (err: any, result: any, fields: any) => {
          if(err) {
            console.log(err);
          }
          if (result && result.length == 1) {
            let username = result[0].u_username;
            let password = result[0].password;
            if (username == req.body.username) {
              if (await bcrypt.compare(req.body.password, password)) {
                let validatedUser = {
                  username: result[0].u_username,
                  role: result[0].role,
                  lastAccessedScreen: result[0].last_accessed,
                  pharmacy: result[0].pharmacy_name,
                  subscriptionPack: result[0].subscription_pack,
                  DateOfSubscription: result[0].date_of_subscription,
                  isTFAEnabled :  result[0].two_fa_enabled ? (result[0].two_fa_enabled == 1 ? true : false) : false,
                  isTFAVerified : false,
                  message: "success",
                };
  
                let userSession = {
                  username: validatedUser.username,
                  haveAccessTo : result[0].have_access_to,
                  role: validatedUser.role,
                  pharmacy: validatedUser.pharmacy,
                  isTFAEnabled :  validatedUser.isTFAEnabled,
                  isTFAVerified : validatedUser.isTFAVerified,
                };
  
                const secretKey = CommonUtil.generateJWTToken({ username : userSession.username, date : Date() });
                session[secretKey] = userSession;
                console.log(`user logged in : `, validatedUser.username);
                res.setHeader(process.env.AUTH_NAME, secretKey);
                res.send(validatedUser);
              } else {
                res.status(200).send({
                  message: "failed",
                  comment: "Username - Password Mismatch",
                });
              }
            } else {
              res.status(200).send({
                message: "failed",
                comment: "Username - Password Mismatch",
              });
            }
          } else {
            res.status(200).send({
              message: "failed",
              comment: "Username - Password Mismatch",
            });
          }
        }
      );
    } else {
      connection.query(
        "select last_accessed, date_of_subscription, subscription_pack  from users u left join user_auth ua on u.username = ua.username where u.username = ? and status = 1",
        [session[req.headers.authorization].username],
        (err: any, result: any, fields: any) => {
          if (result && result.length === 1) {
            let validatedUser = {
              username: session[req.headers.authorization].username,
              role: session[req.headers.authorization].role,
              lastAccessedScreen: result[0].last_accessed,
              pharmacy: session[req.headers.authorization].pharmacy_name,
              subscriptionPack: result[0].subscription_pack,
              DateOfSubscription: result[0].date_of_subscription,
              isTFAEnabled :  session[req.headers.authorization].isTFAEnabled,
              isTFAVerified : session[req.headers.authorization].isTFAVerified,
              message: "success",
            };
            res.status(200).send(validatedUser);
          } else {
            AuthUtil.deleteProvidedSession(req.headers.authorization, session);
            res.status(200).send({
              message: "failed",
              comment: "Try login again",
            });
          }
        }
      );
    }
  } catch (e) {
    console.log("/login : ", e);
    res.status(200).send({
      message: "failed",
      comment: "Failed to Login - try again later",
    });
  }
}

function createNewUser(req: any, res: any) {
  let validationMessage = validateNewUser(req);
  if(validationMessage !== "") {
    res.status(200).send({
      status: "danger",
      message: validationMessage,
    });
    return;
  }

  let connection = req.db;
  let session = req.session;
  let otpRecords = req.otpRecords;
  let newUserAuthKey: string = process.env.NEW_USER_AUTH_KEY || "";

  connection.query(
    "select * from users where username = ?",
    [req.body.username],
    async (err: any, result: any, fields: any) => {
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
        !otpRecords[req.headers[newUserAuthKey]] ||
        !otpRecords[req.headers[newUserAuthKey]].mail
      ) {
        console.error("otp not found");
        res.status(200).send({
          status: "error",
          message: "Verify your email...",
        });
        return;
      } else if (
        otpRecords[req.headers[newUserAuthKey]].mail !== req.body.email
      ) {
        console.error("email is not the same");
        delete otpRecords[req.headers[newUserAuthKey]];
        res.status(200).send({
          status: "error",
          message: "Email Mismatch...",
        });
        return;
      } else if (
        otpRecords[req.headers[newUserAuthKey]].minute > date.getMinutes()
      ) {
        if (
          date.getMinutes() +
            (60 - otpRecords[req.headers[newUserAuthKey]].minute) >
          5
        ) {
          delete otpRecords[req.headers[newUserAuthKey]];
          res.status(200).send({
            status: "error",
            message: "OTP expired",
          });
          return;
        }
      } else if (
        otpRecords[req.headers[newUserAuthKey]].minute < date.getMinutes()
      ) {
        if (
          date.getMinutes() - otpRecords[req.headers[newUserAuthKey]].minute >
          5
        ) {
          delete otpRecords[req.headers[newUserAuthKey]];
          res.status(200).send({
            status: "error",
            message: "OTP expired",
          });
          return;
        }
      } else if (otpRecords[req.headers[newUserAuthKey]].otp !== req.body.otp) {
        res.status(200).send({
          status: "error",
          message: "Invalid OTP",
        });
        return;
      }
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
        (err1: any, result1: any, fields1: any) => {
          if (err1) {
            console.log(err1);
            res.status(200).send({
              status: "danger",
              message: "Something went wrong",
            });
          } else {
            try {
              var mailOptions = {
                from: process.env.BRAND_NAME + " <security-alert@" + process.env.BRAND_NAME?.toLowerCase() +".com>",
                to: otpRecords[req.headers[newUserAuthKey]].mail,
                subject: "Congratulations",
                text:
                  "Your " + process.env.BRAND_NAME + " " +
                  (req.body.pharmacyName === "" ? "" : "Management ") +
                  "Account has been Created Successfully",
              };

              transporter.sendMail(
                mailOptions,
                function (error: any, info: any) {
                  if (error) {
                    res.status(200).send({
                      status: "error",
                      message: "Enter a valid email",
                    });
                    return;
                  } else {
                    console.log("Email sent: " + req.body.email);
                  }
                }
              );

              delete otpRecords[req.headers[newUserAuthKey]];

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
  );
}

const validateNewUser = (req : any) => {
  let valid = Validator.validateUsername(req.body.username);
  if(valid != "") {
    return valid;
  }
  valid = Validator.validatePassword(req.body.password);
  if(valid != "") {
    return valid;
  }
  valid = Validator.validateEmail(req.body.email);
  if(valid != "") {
    return valid;
  }
  valid = Validator.validatePhoneNumber(req.body.mobileNumber);
  if(valid != "") {
    return valid;
  }
  if(req.body.pharmacyName !== "") {
    valid = Validator.validatePharmacyName(req.body.pharmacyName);
    if(valid != "") {
      return valid;
    }
  }
  return "";
}

module.exports = {
  checkUserDuplicateDetails,
  isUserLoggedIn,
  updateLastAccessedScreen,
  loginUser,
  createNewUser,
};
