function getApprovedItems(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0",
    ["NOT_ALLOCATED", session[req.headers.authorization].pharmacy],
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
            mname: element.medname,
            quantity: element.quantity,
            mobileNumber: element.mobile_number,
          });
        });
        res.status(200).send(temp);
      }
    }
  );
}

function pickupOrder(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update approved_items set delivery_man = ? where username = ? and medname = ? and pharmacy_name = ?",
    [
      session[req.headers.authorization].username,
      req.body.username,
      req.body.medName,
      session[req.headers.authorization].pharmacy,
    ],
    (err: any, result: any, fields: any) => {
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
}

function getDeliveryOrders(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0",
    [
      session[req.headers.authorization].username,
      session[req.headers.authorization].pharmacy,
    ],
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
            mname: element.medname,
            quantity: element.quantity,
            mobileNumber: element.mobile_number,
          });
        });
        res.status(200).send(temp);
      }
    }
  );
}

module.exports = {
  getApprovedItems,
  pickupOrder,
  getDeliveryOrders,
};
