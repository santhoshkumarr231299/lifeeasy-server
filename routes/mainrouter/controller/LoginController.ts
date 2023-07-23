import isUndefined from "../../util/commonUtil";

export function checkUserDuplicateDetails(req : any, res : any) {
    try {
        var connection = req.db;
        connection.query(
          "select (select count(username) from users where username = ?) as username_count, (select count(email) from users where email = ?) as email_count, (select count(mobile_number) from users where mobile_number = ?) as mobile_number_count",
          [req.body.username, req.body.email, req.body.mobileNumber],
          (err : any, result : any, fields : any) => {
            if (
              !result ||
              (+result[0].username_count === 0 &&
                +result[0].email_count === 0 &&
                +result[0].mobile_number_count === 0)
            ) {
              res.status(200).send({
                status: "success",
                message: "Details not found",
              });
              return;
            } else if (+result[0].username_count > 0) {
              res.status(200).send({
                status: "warning",
                message: "Username already exists...",
              });
              return;
            } else if (+result[0].email_count > 0) {
              res.status(200).send({
                status: "warning",
                message: "Email already exists...",
              });
              return;
            } else if (+result[0].mobile_number_count > 0) {
              res.status(200).send({
                status: "warning",
                message: "Mobile Number already exists...",
              });
              return;
            } else {
              res.status(200).send({
                status: "success",
                message: "Details not found",
              });
              return;
            }
          }
        );
      } catch (err) {
        console.log(err);
        res.status(500).send({
          status: "error",
          message: "Something went wrong",
        });
    }
}

export function isUserLoggedIn(req : any, res : any) {
    try {
        var connection = req.db;
        var session = req.session;
        if (
          isUndefined(req.headers.authorization) ||
          isUndefined(session[req.headers.authorization])
        ) {
          res.status(200).send({
            username: "",
          });
        } else {
            connection.query(
                "select * from users where username = ?  and status = 1",
                [
                  session[req.headers.authorization].username,
                  session[req.headers.authorization].pharmacy,
                ],
                (err : any, result : any, fields : any) => {
                  if (result && result.length === 1) {
                    res.status(200).send({
                      username: session[req.headers.authorization].username,
                      role: session[req.headers.authorization].role,
                      lastAccessedScreen: result[0].last_accessed,
                      haveAccessTo: result[0].have_access_to,
                      pharmacy: session[req.headers.authorization].pharmacy,
                      subscriptionPack: result[0].subscription_pack,
                      DateOfSubscription: result[0].date_of_subscription,
                    });
                  } else {
                    res.status(200).send({
                      username: "",
                    });
                  }
                }
              );
        }
      } catch (e) {
        console.log(e);
        res.status(200).send({
          username: "",
        });
      }
}