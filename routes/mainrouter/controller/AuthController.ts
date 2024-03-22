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
          "select u.username, u.role, u.last_accessed, u.subscription_pack, u.date_of_subscription, up.theme_background, up.theme_font_color, up.theme_others from users u left join user_props up on u.username = up.username where u.username = ?  and u.status = 1",
          [session[req.headers.authorization].username, session[req.headers.authorization].pharmacy],
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
                theme : {
                  background : result[0].theme_background ? result[0].theme_background : "default",
                  fontColor : result[0].theme_font_color ? result[0].theme_font_color  : "default",
                  others : result[0].theme_others ? result[0].theme_others : "default"
                }
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