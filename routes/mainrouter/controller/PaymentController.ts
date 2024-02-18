const Razorpay = require("razorpay");

function makeOrder(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update cartitems set is_ordered = 1 where username = ? and is_ordered = 0",
    [session[req.headers.authorization].username],
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
          message: "Ordered Successfully",
        });
      }
    }
  );
}

function purchaseCartItems(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  console.log("username : ", session[req.headers.authorization].username);
  connection.query(
    "select medname, quantity, price from cartitems where username = ? and is_ordered = 0",
    [session[req.headers.authorization].username],
    async (err: any, result: any, fields: any) => {
      if (err) {
        console.log(err);
        res.status(500).send("Some error occured");
      } else {
        if (!result || result.length === 0) {
          res.status(200).send("Cart is Empty");
          return;
        } else {
          let totalPay = 0;
          result.forEach(
            (data: any) => (totalPay += +data.quantity * +data.price)
          );
          try {
            const instance = new Razorpay({
              key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
              key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
            });

            const options = {
              amount: totalPay * 100,
              currency: "INR",
              receipt: "receipt_order_74394",
            };

            const order = await instance.orders.create(options);

            if (!order) return res.status(500).send("Some error occured");

            res.json(order);
          } catch (error) {
            console.log("error", error);
            res.status(500).send(error);
          }
        }
      }
    }
  );
}

function paymentDoneForCartPurchase(req: any, res: any) {
  console.log("Payment successfull : " + req.body.razorpayPaymentId);
  return makeOrder(req, res);
}

function paymentDoneForSubscription(req: any, res: any) {
  console.log("Payment successfull : " + req.body.razorpayPaymentId);
  return activateSubscription(req, res);
}

async function purchaseSubscriptionPlan(req: any, res: any) {
  let totalPay = req.body.subscriptionType == "monthly" ? 10 : 100;
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
      key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
    });

    const options = {
      amount: totalPay * 100,
      currency: "INR",
      receipt: "receipt_order_74394",
    };

    const order = await instance.orders.create(options);

    if (!order) return res.status(500).send("Some error occured");

    res.json(order);
  } catch (error) {
    console.log("error", error);
    res.status(500).send(error);
  }
}

function activateSubscription(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update users set subscription_pack = ?, date_of_subscription = now() where pharmacy_name = ?",
    [req.body.subscriptionType, session[req.headers.authorization].pharmacy],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(err);
        res.status(500).send({
          status: "failed",
          message: "Some error occured",
        });
      } else {
        res.send({
          status: "success",
          message: `Subscription Activated : ${
            req.body.subscriptionType[0].toUpperCase() +
            req.body.subscriptionType.substring(1)
          }`,
        });
      }
    }
  );
}

function activateFreeTrial(req : any, res : any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "update users set subscription_pack = ?, date_of_subscription = now() where pharmacy_name = ?",
    ["monthly", session[req.headers.authorization].pharmacy],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(err);
        res.status(500).send({
          status: "failed",
          message: "Some error occured",
        });
      } else {
        res.send({
          status: "success",
          message: "Subscription Activated : Free Trial For 1 Month",
        });
      }
    }
  );
}

module.exports = {
  purchaseCartItems,
  paymentDoneForCartPurchase,
  purchaseSubscriptionPlan,
  paymentDoneForSubscription,
  activateFreeTrial
};
