const Validator = require("../../util/validators.ts");

function getUserDetails(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select u.username as u_username, email, mobile_number, pharmacy_name, branch_id, two_fa_enabled from users u left join user_auth ua on u.username = ua.username where u.username = ? and status = 1",
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (result) {
        res.status(200).send({
          username: result[0].u_username,
          email: result[0].email,
          mobileNumber: result[0].mobile_number,
          pharmacyName: result[0].pharmacy_name,
          branchId: result[0].branch_id,
          isTFAEnabled : result[0].two_fa_enabled == 1 ? true : false,
          message: "success",
        });
      } else {
        res.status(200).send({
          username: "",
          message: "success",
        });
      }
    }
  );
}

function updateUserDetails(req: any, res: any) {

  let validationMessage = validateUserDetails(req);
  if(validationMessage != "") {
    res.status(200).send({
      status: "error",
      message: validationMessage,
    });
    return;
  }

  let connection = req.db;
  let session = req.session;
  if (session[req.headers.authorization].username !== req.body.username) {
    res.status(200).send({
      status: "error",
      message: "You cannot change Username",
    });
    return;
  }
  var queryParam = [
    req.body.email,
    req.body.mobileNumber,
    req.body.branchId,
    session[req.headers.authorization].username,
  ];
  connection.query(
    "update users set email = ?, mobile_number = ?, branch_id = ?  where username = ?",
    queryParam,
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else if (result.changedRows == 0) {
        res.status(200).send({
          status: "warning",
          message: "User Values are the same before",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "New User Values Updated successfully",
        });
      }
    }
  );
}

const validateUserDetails = (req : any) : string => {
  let validationMessage = Validator.validateUsername(req.body.username);
  if(validationMessage != "") return validationMessage;
  validationMessage = Validator.validateEmail(req.body.email);
  if(validationMessage != "") return validationMessage;
  validationMessage = Validator.validatePhoneNumber(req.body.mobileNumber);
  if(validationMessage != "") return validationMessage;
  // validate branch ID
  return "";
}

module.exports = {
  getUserDetails,
  updateUserDetails,
};
