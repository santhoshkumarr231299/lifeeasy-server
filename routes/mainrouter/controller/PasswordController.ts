const AuthUtil = require("../../util/AuthUtil.ts");
const bcrypt = require("bcrypt");
const StartupController = require("./StartupController.ts");
require("dotenv").config();

const transporter = StartupController.getTransporterData();

function updatePassword(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select username, password, email from users where username = ?",
    [session[req.headers.authorization].username],
    async (err: any, result: any, fields: any) => {
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
            (err: any, result: any, fields: any) => {
              if (err) {
                res.status(200).send({
                  status: "error",
                  message: "Something went wrong",
                });
              } else {
                AuthUtil.deleteUserSession(
                  session[req.headers.authorization].username,
                  session
                );
                var mailOptions = {
                  from: "PharmSimple <security-alert@pharmsimple.com>",
                  to: email,
                  subject: "Password Changed",
                  text: "The Password of Your Account has been Changed",
                };

                transporter.sendMail(
                  mailOptions,
                  function (error: any, info: any) {
                    if (error) {
                      console.log(error);
                    } else {
                      console.log("Password changed : " + email);
                    }
                  }
                );
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
}

async function forgotPasswordChange(req: any, res: any) {
  try {
    let connection = req.db;
    let otpRecords = req.otpRecords;
    let session = req.session;
    let forgotPasswordChangeAuth: string =
      process.env.FORGOT_PASS_CHANGE_AUTH || "";
    let date = new Date();
    if (
      otpRecords[req.headers[forgotPasswordChangeAuth]].minute >
      date.getMinutes()
    ) {
      if (
        date.getMinutes() +
          (60 - otpRecords[req.headers[forgotPasswordChangeAuth]].minute) >
        5
      ) {
        delete otpRecords[req.headers[forgotPasswordChangeAuth]];
        res.status(200).send({
          status: "error",
          message: "OTP expired",
        });
        return;
      }
    } else if (
      !req.headers[forgotPasswordChangeAuth] ||
      !otpRecords[req.headers[forgotPasswordChangeAuth]]
    ) {
      delete otpRecords[req.headers[forgotPasswordChangeAuth]];
      res.status(200).send({
        status: "error",
        message: "OTP expired",
      });
      return;
    } else if (
      !otpRecords[req.headers[forgotPasswordChangeAuth]] ||
      !otpRecords[req.headers[forgotPasswordChangeAuth]].mail
    ) {
      delete otpRecords[req.headers[forgotPasswordChangeAuth]];
      res.status(200).send({
        status: "error",
        message: "Verify your email...",
      });
      return;
    } else if (
      otpRecords[req.headers[forgotPasswordChangeAuth]].minute <
      date.getMinutes()
    ) {
      if (
        date.getMinutes() -
          otpRecords[req.headers[forgotPasswordChangeAuth]].minute >
        5
      ) {
        res.status(200).send({
          status: "error",
          message: "OTP expired",
        });
        return;
      }
    } else if (
      otpRecords[req.headers[forgotPasswordChangeAuth]].otp !== req.body.otp
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
          otpRecords[req.headers[forgotPasswordChangeAuth]].username,
        ],
        (err: any, result: any, fields: any) => {
          if (err) {
            console.error(err);
            res.status(200).send({
              status: "error",
              message: "Something went wrong",
            });
          } else {
            AuthUtil.deleteUserSession(
              otpRecords[req.headers[forgotPasswordChangeAuth]].username,
              session
            );

            var mailOptions = {
              from: "PharmSimple <security-alert@pharmsimple.com>",
              to: otpRecords[req.headers[forgotPasswordChangeAuth]].mail,
              subject: "Security Alert",
              text: "Your PharmSimple Account Password has been Changed",
            };

            transporter.sendMail(mailOptions, function (error: any, info: any) {
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

            delete otpRecords[req.headers[forgotPasswordChangeAuth]];

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
}

module.exports = {
  updatePassword,
  forgotPasswordChange,
};
