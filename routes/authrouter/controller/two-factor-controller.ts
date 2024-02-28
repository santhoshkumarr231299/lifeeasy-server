const StartupController = require("../../mainrouter/controller/StartupController.ts");

const transporter = StartupController.getTransporterData();

function sendOTP(req : any, res : any) {
  let connection = req.db;
  let otpRecords = req.otpRecords;
  let session = req.session;
  connection.query("select email from users where username = ?", [session[req.headers.authorization].username], (err : any, result : any, fields : any) => {
    if(!err && result && result.length == 1) {
        let email = result[0].email;
        let date = new Date();

        const secretKey = req.headers.authorization;

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
            process.env.BRAND_NAME +  " Account Verfication OTP (valid for 5 minutes) : " +
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
    } else {
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
    if (
      otpRecords[req.headers.authorization].minute >
      date.getMinutes()
    ) {
      if (
        date.getMinutes() +
          (60 - otpRecords[req.headers.authorization].minute) >
        5
      ) {
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
    delete otpRecords[req.headers.authorization];
    session[req.headers.authorization].isTFAVerified = true;
    res.send({
        status : "success",
        message : "OTP has been Verified"
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

module.exports = {
    sendOTP,
    verifyOTP,
    getUserDetailsForTFA
}