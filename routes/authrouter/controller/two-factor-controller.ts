const StartupController = require("../../mainrouter/controller/StartupController.ts");
const authUtil = require("../../util/AuthUtil.ts");
const TfaAuthUtil = require("../utils/tfa-auth-util.ts");
const transporter = StartupController.getTransporterData();

function sendOTP(req : any, res : any) {
  let connection = req.db;
  let otpRecords = req.otpRecords;
  let session = req.session;
  connection.query("select u.email, ua.last_otp_sent from users u left join user_auth ua on u.username = ua.username where u.username = ?", [session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
    if(!err && result && result.length == 1) {
        const email = result[0].email;
        const currentDateTime = new Date();
        const lastOTPSentDateTime = new Date(result[0].last_otp_sent);

        if(!TfaAuthUtil.isAllowedToSentOtpForTFA(currentDateTime, lastOTPSentDateTime)) {
          res.status(200).send({
            status: "success",
            message: "Already OTP had been sent, kindly check the inbox",
          });
          return;
        }

        connection.query("insert into user_auth (username, last_otp_sent) values (?, ?) on duplicate key update last_otp_sent = ?", [session[req.headers.authorization].username, currentDateTime, currentDateTime], (err1 : any, result1 : any, fields1 : any ) => {
          if(err) {
            console.log(err);
            res.status(200).send({
              status: "failed",
              message: "Something went wrong",
            });
          } else {
            const secretKey = req.headers.authorization;

            otpRecords[secretKey] = {
              username: req.body.username,
              mail: result[0].email,
              otp: Math.floor(Math.random() * 9000 + 1000).toString(),
              hour: currentDateTime.getHours(),
              minute: currentDateTime.getMinutes(),
            };

            var mailOptions = {
              from: process.env.BRAND_NAME + " <security-alert@" + process.env.BRAND_NAME?.toLowerCase() + ".com>",
              to: result[0].email,
              subject: "Verify Your Account",
              text:
                process.env.BRAND_NAME +  " Account Verfication OTP (valid for " + Number(process.env.MAIL_OTP_EXPIRY_MINUTE) + " minutes) : " +
                otpRecords[secretKey].otp,
            };

            transporter.sendMail(mailOptions, function (error: any, info: any) {
              if (error) {
                console.log(error);
                res.status(200).send({
                  status: "failed",
                  message: "Something went wrong",
                });
                return;
              } else {
                console.log("Email sent - 2FA: " + result[0].email);
                res.status(200).send({
                  status: "success",
                  message: "OTP has been delivered to the mail",
                });
              }
            });
          }
        });
    } else {
      console.log(result.length);
      console.log(err);
        res.send({
            status : "failed",
            message : "Something went wrong"
        })
    }
  })
}

function verifyOTP(req : any, res : any) {
    let connection = req.db;
    let otpRecords = req.otpRecords;
    let session = req.session;

    let date = new Date();
    if (otpRecords[req.headers.authorization].minute > date.getMinutes()) {
      if (date.getMinutes() + (60 - otpRecords[req.headers.authorization].minute) >  Number(process.env.MAIL_OTP_EXPIRY_MINUTE)) {
        delete otpRecords[req.headers.authorization];
        res.status(200).send({
          status: "error",
          message: "The Provided OTP is expired",
        });
        return;
      }
    } else if (!req.headers.authorization || !otpRecords[req.headers.authorization]) {
      delete otpRecords[req.headers.authorization];
      res.status(200).send({
        status: "error",
        message: "The Provided OTP is expired",
      });
      return;
    } else if (!otpRecords[req.headers.authorization] || !otpRecords[req.headers.authorization].mail) {
      delete otpRecords[req.headers.authorization];
      res.status(200).send({
        status: "error",
        message: "Please register your mail",
      });
      return;
    } else if (otpRecords[req.headers.authorization].minute < date.getMinutes()) {
      if (date.getMinutes() - otpRecords[req.headers.authorization].minute > Number(process.env.MAIL_OTP_EXPIRY_MINUTE)) {
        res.status(200).send({
          status: "error",
          message: "The Provided OTP is expired",
        });
        return;
      }
    } else if (Number(otpRecords[req.headers.authorization].otp) !== Number(req.body.otp)) {
      res.status(200).send({
        status: "error",
        message: "The Provided OTP is invalid",
      });
      return;
    }
    connection.query("update user_auth set last_otp_sent = ? where username = ?", [null, session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
      delete otpRecords[req.headers.authorization];
      session[req.headers.authorization].isTFAVerified = true;
      res.send({
          status : "success",
          message : "OTP has been Verified"
      });
    });
}

function getUserDetailsForTFA(req : any, res : any) {
  let connection = req.db;
  let session = req.session;
  connection.query("select email from users where username = ? ", [session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
    if(err) {
      res.send({
        status : "failed",
      })
    } else if(result && result.length == 1) {
      let email = result[0].email;
      let staredEmail = makeEmailStared(email);
      res.send({
        status : "success",
        email : staredEmail
      })
    } else {
      res.send({
        status : "failed",
      })
    }
  })  
}

const makeEmailStared = (email : string) => {
  let isAtReached : boolean = false;
  let result : string = "";
  for(let i = 0; i<email.length; i++) {
    if(i < 3) {
      result += email[i];
      continue;
    }
    if(isAtReached || email[i] == '@') {
      isAtReached = true;
      result += email[i];
    } else  {
      result += '*';
    }
  }
  return result;
}

function configureTFA(req : any, res : any) {
  let connection = req.db;
    let otpRecords = req.otpRecords;
    let session = req.session;

    let date = new Date();
    if (otpRecords[req.headers.authorization].minute > date.getMinutes()) {
      if (date.getMinutes() + (60 - otpRecords[req.headers.authorization].minute) > 5) {
        delete otpRecords[req.headers.authorization];
        res.status(200).send({
          status: "error",
          message: "The Provided OTP is expired",
        });
        return;
      }
    } else if (
      !req.headers.authorization ||
      !otpRecords[req.headers.authorization]
    ) {
      delete otpRecords[req.headers.authorization];
      res.status(200).send({
        status: "error",
        message: "The Provided OTP is expired",
      });
      return;
    } else if (
      !otpRecords[req.headers.authorization] ||
      !otpRecords[req.headers.authorization].mail
    ) {
      delete otpRecords[req.headers.authorization];
      res.status(200).send({
        status: "error",
        message: "Please register your mail",
      });
      return;
    } else if (
      otpRecords[req.headers.authorization].minute <
      date.getMinutes()
    ) {
      if (
        date.getMinutes() -
          otpRecords[req.headers.authorization].minute >
        5
      ) {
        res.status(200).send({
          status: "error",
          message: "The Provided OTP is expired",
        });
        return;
      }
    } else if (
      Number(otpRecords[req.headers.authorization].otp) !== Number(req.body.otp)
    ) {
      res.status(200).send({
        status: "error",
        message: "The Provided OTP is invalid",
      });
      return;
    }
    if(req.url == "/enable") {
      connection.query("update user_auth set two_fa_enabled = ?, last_otp_sent = ? where username = ?", [1, null, session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
        if(err) {
          console.log(err);
          res.status(200).send({
            status: "error",
            message: "Something went wrong",
          });
        } else {
          authUtil.deleteUserSession(session[req.headers.authorization].username, session);
          res.send({
            status: "success",
            message: "Two Factor Authentication is enabled",
          })
        }
      })
    } else if(req.url == "/disable") {
      connection.query("update user_auth set two_fa_enabled = ? where username = ?", [0, session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
        if(err) {
          console.log(err);
          res.status(200).send({
            status: "error",
            message: "Something went wrong",
          });
        } else {
          res.send({
            status: "success",
            message: "Two Factor Authentication is disabled",
          })
        }
      })
    } else {
      res.send({
        status: "success",
        message: "Please check with the URL",
      })
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    getUserDetailsForTFA,
    configureTFA
}