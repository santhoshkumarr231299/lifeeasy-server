const CommonUtil = require("../../util/CommonUtil.ts");

function getMenus(req : any, res : any) {
    let connection = req.db;
    let session = req.session;
    connection.query("select id as screen_id, field_name as screen_name from menus order by id asc", (err : any, result : any, fields : any) => {
        if(err) {
            console.log(err);
            res.send({
                status : "failed",
                message : "Something went wrong"
            })
        } else {
            if(result) {
                let dataList : any[] = [];
                result.forEach((data : any) => {
                    dataList.push({
                        menuId : data.screen_id,
                        menuName : data.screen_name
                    });
                })
                dataList = dataList.filter(data => session[req.headers.authorization].haveAccessTo.includes("[" + data.menuId + "]"));
                res.send({
                    status : "success",
                    data : dataList
                });
            }
        }
    })
}

function isUserLoggedIn(req: any, res: any) {
    try {
      let connection = req.db;
      let session = req.session;
      if (
        CommonUtil.isUndefined(req.headers.authorization) ||
        CommonUtil.isUndefined(session[req.headers.authorization])
      ) {
        res.status(200).send({});
      } else {
        connection.query(
          "select * from users where username = ?  and status = 1",
          [
            session[req.headers.authorization].username,
            session[req.headers.authorization].pharmacy,
          ],
          (err: any, result: any, fields: any) => {
            if (result && result.length === 1) {
              res.status(200).send({
                username: session[req.headers.authorization].username,
                role: session[req.headers.authorization].role,
                lastAccessedScreen: result[0].last_accessed,
                pharmacy: session[req.headers.authorization].pharmacy,
                subscriptionPack: result[0].subscription_pack,
                DateOfSubscription: result[0].date_of_subscription,
                isTFAEnabled :  session[req.headers.authorization].isTFAEnabled,
                isTFAVerified : session[req.headers.authorization].isTFAVerified,
              });
            } else {
              res.status(200).send({});
            }
          }
        );
      }
    } catch (e) {
      console.log(e);
      res.status(200).send({});
    }
} 

module.exports = {
    getMenus,
    isUserLoggedIn
}