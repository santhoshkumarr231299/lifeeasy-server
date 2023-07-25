export function getCartItems(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select medname, quantity, price, mid from cartitems where username = ? and is_ordered = 0",
    [
      session[req.headers.authorization].username,
      session[req.headers.authorization].pharmacy,
    ],
    (err: any, result: any, fields: any) => {
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      let data: any = [];
      let count = 1;
      result.map((item: any) => {
        data.push({
          id: count++,
          medName: item.medname,
          price: item.price,
          quantity: item.quantity,
          mid: item.mid,
        });
      });
      res.status(200).send(data);
    }
  );
}

export function getCartItemsCount(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select count(username) as total from cartitems where username = ? and is_ordered = 0",
    [
      session[req.headers.authorization].username,
      session[req.headers.authorization].pharmacy,
    ],
    (err: any, result: any, fields: any) => {
      res.status(200).send({
        cartSize: result[0].total,
        message: "success",
      });
    }
  );
}

export function updateCartItems(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update cartitems set quantity = ? where username = ? and mid = ?",
    [
      req.body.newQuantity,
      session[req.headers.authorization].username,
      req.body.mid,
    ],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(
          session[req.headers.authorization].username + " - Error : " + err
        );
        res.status(500).send({
          status: "failed",
          message: "Error",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "Item deleted Successfully",
        });
      }
    }
  );
}

export function deleteCartItems(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "delete from cartitems where username = ? and mid = ?",
    [session[req.headers.authorization].username, req.body.mid],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(
          session[req.headers.authorization].username + " - Error : " + err
        );
        res.status(500).send({
          status: "failed",
          message: "Error",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "Item deleted Successfully",
        });
      }
    }
  );
}

export function addToCart(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  let query =
    "select count(*) as total from cartitems where username = ? and medname = ? and is_ordered = 0 and mid = ?";
  let queryParam = [
    session[req.headers.authorization].username,
    req.body.medName,
    req.body.mid,
  ];

  connection.query(query, queryParam, (err: any, result: any, fields: any) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went wrong",
      });
    } else if (result[0].total > 0) {
      res.status(200).send({
        status: "warning",
        message: `${req.body.medName} is already in cart...`,
      });
    } else {
      connection.query(
        "insert into cartitems (mid, username, medname, quantity, price,pharm_name) values (?,?, ?, ?, (select m.med_rate from medicines m where mid = ?), (select distinct u.pharmacy_name from users u where u.username in (select distinct uu.added_by from medicines uu where uu.mname = ?)))",
        [
          req.body.mid,
          session[req.headers.authorization].username,
          req.body.medName,
          req.body.quantity,
          req.body.mid,
          req.body.medName,
        ],
        (err2: any, result2: any, fields2: any) => {
          if (err2) {
            console.log(err2);
            res.status(200).send({
              status: "error",
              message: "Something went wrong",
            });
          } else {
            res.status(200).send({
              status: "success",
              message: `${req.body.medName} is added to Cart`,
            });
          }
        }
      );
    }
  });
}
