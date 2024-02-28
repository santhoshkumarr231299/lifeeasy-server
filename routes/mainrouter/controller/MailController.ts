const CommonUtil = require("../../util/CommonUtil.ts");
const StartupController = require("./StartupController.ts");

const transporter = StartupController.getTransporterData();

function verifyEmail(req: any, res: any) {
  let connection = req.db;
  let otpRecords = req.otpRecords;
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
    (err: any, result: any, fields: any) => {
      if (!(!result || result.length === 0)) {
        res.status(200).send({
          status: "error",
          message: "Email already exists",
        });
        return;
      } else {
        let date = new Date();

        const secretKey = CommonUtil.getRandomUuid();

        otpRecords[secretKey] = {
          mail: req.body.email,
          otp: Math.floor(Math.random() * 9000 + 1000).toString(),
          hour: date.getHours(),
          minute: date.getMinutes(),
        };

        var mailOptions = {
          from: process.env.BRAND_NAME + " <security-alert@" + process.env.BRAND_NAME?.toLowerCase() + ".com>",
          to: req.body.email,
          subject: "Verify Your Email",
          text:
            process.env.BRAND_NAME + " Email Verfication OTP (valid for 5 minutes) : " +
            otpRecords[secretKey].otp,
        };

        transporter.sendMail(mailOptions, function (error: any, info: any) {
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
}

function generateEmail(req: any, res: any) {
  let connection = req.db;
  let otpRecords = req.otpRecords;
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
    (err: any, result: any, fields: any) => {
      if (!result || result.length === 0) {
        res.status(200).send({
          status: "success",
          message: "OTP has been delivered to mail if username and email exists",
        });
        return;
      } else {
        let date = new Date();

        const secretKey = CommonUtil.getRandomUuid();

        otpRecords[secretKey] = {
          username: req.body.username,
          mail: result[0].email,
          otp: Math.floor(Math.random() * 9000 + 1000).toString(),
          hour: date.getHours(),
          minute: date.getMinutes(),
        };

        var mailOptions = {
          from: process.env.BRAND_NAME + " <security-alert@" + process.env.BRAND_NAME?.toLowerCase() + ".com>",
          to: result[0].email,
          subject: "Verify Your Account",
          text:
            process.env.BRAND_NAME + " Account Verfication OTP (valid for 5 minutes) : " +
            otpRecords[secretKey].otp,
        };

        transporter.sendMail(mailOptions, function (error: any, info: any) {
          if (error) {
            console.log(error);
            res.status(200).send({
              status: "success",
              message: "OTP has been delivered to mail if username and email exists",
            });
            return;
          } else {
            console.log("Email sent: " + result[0].email);
            res.setHeader(process.env.FORGOT_PASS_CHANGE_AUTH, secretKey);
            res.status(200).send({
              status: "success",
              message: "OTP has been delivered to mail if username and email exists",
              // secretKey: secretKey,
            });
          }
        });
      }
    }
  );
}

module.exports = {
  verifyEmail,
  generateEmail,
};
