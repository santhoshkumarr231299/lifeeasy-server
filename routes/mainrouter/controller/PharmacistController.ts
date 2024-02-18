function approveOrder(req: any, res: any) {
  let connection = req.db;
  var queryParam1 = [req.body.username, req.body.mname, req.body.mid];
  connection.query(
    "insert into approved_items (mid, username, medname, quantity,price, pharmacy_name) select ci.mid, ci.username, ci.medname, ci.quantity, ci.price, ci.pharm_name from cartitems ci where username = ? and medname = ? and mid = ? and is_ordered = 1",
    queryParam1,
    (err1: any, result1: any, fields1: any) => {
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
          (err: any, result: any, fields: any) => {
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
}

function declineOrder(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update cartitems set is_ordered = 2 where username = ? and is_ordered = 1 and mid = ? and medname = ?",
    [req.body.username, req.body.mid, req.body.mname],
    (err: any, result: any, fields: any) => {
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

function getOrdersForApproval(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select * from cartitems where is_ordered = 1 and pharm_name = ?",
    [session[req.headers.authorization].pharmacy],
    (err: any, result: any, fields: any) => {
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
        let temp: any = [];
        result.forEach((element: any) => {
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
}

module.exports = {
  approveOrder,
  declineOrder,
  getOrdersForApproval,
};
