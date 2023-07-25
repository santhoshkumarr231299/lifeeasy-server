export function getUserDetails(req: any, res: any) {
  let connection = req.db;
  connection.query(
    "select *  from users where username = ?",
    [req.body.username],
    (err: any, result: any, fields: any) => {
      if (result) {
        res.status(200).send({
          username: result[0].username,
          email: result[0].email,
          mobileNumber: result[0].mobile_number,
          pharmacyName: result[0].pharmacy_name,
          branchId: result[0].branch_id,
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

export function updateUserDetails(req: any, res: any) {
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
    (err : any, result : any, fields : any) => {
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
