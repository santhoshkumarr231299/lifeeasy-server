const AuthUtil = require("../../util/AuthUtil.ts");

function getUsers(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  if (session[req.headers.authorization].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    });
    return;
  }
  let searchPattern = "%" + req.body.search + "%";
  connection.query(
    "select username from users where pharmacy_name = (select u.pharmacy_name from users u where u.username = ? ) and role <> 1 and username like ?",
    [session[req.headers.authorization].username, searchPattern],
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send({
            status: "success",
            message: "Users",
            users: [],
          });
          return;
        }
        let usersTemp: any = [];
        result.map((user: any) => usersTemp.push(user));
        res.status(200).send({
          status: "success",
          message: "Users",
          users: usersTemp,
        });
      }
    }
  );
}

function getUserPrevileges(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  if (session[req.headers.authorization].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    });
    return;
  }
  connection.query(
    "select have_access_to, status from users where username = ?",
    [req.body.username],
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        let userPrevileges : string = result[0].have_access_to;
        let userPrevArr : string[]  = userPrevileges.replaceAll("[", "").replaceAll("]", " ").split(" ").filter((item : string) => item != "");
        let userPrevArrNum : number[] = [];
        userPrevArr.forEach(item => {
          userPrevArrNum.push(Number(item));
        });
        res.status(200).send({
          status: "success",
          message: "User Previlges",
          userPrevileges: userPrevArrNum,
          userStatus: result[0].status == 1 ? true : false,
        });
      }
    }
  );
}

function updateUserPrevileges(req: any, res: any) {
  try {
    let connection = req.db;
    let session = req.session;
    if (session[req.headers.authorization].role !== 1) {
      res.status(200).send({
        status: "error",
        message: "Authorization Failed",
      });
      return;
    }
    let query: string;
    let list: any[];
    if (req.body.userStatus) {
      let userPreviliges : string = "";
      let userPrevArr : number[] = req.body.userPrevileges;
      userPrevArr.forEach((screenCode : number) => {
        userPreviliges += "[" + screenCode + "]";
      });
      query =
        "update users set have_access_to = ?, last_accessed = ?, status = 1 where username = ?";
      list = [
        userPreviliges,
        req.body.lastAccessedScreen,
        req.body.username,
      ];
    } else {
      query = "update users set status = 0 where username = ?";
      list = [req.body.username];
    }
    connection.query(query, list, (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!req.body.userStatus) {
          AuthUtil.deleteUserSession(req.body.username, session);
        }
        res.status(200).send({
          status: "success",
          message: "User Previleges Updated successfully",
        });
      }
    });
  } catch (e) {
    console.error(e);
    res.status(200).send({
      status: "error",
      message: "Something went wrong",
    });
  }
}

function postNewManager(req: any, res: any) {}

module.exports = {
  getUsers,
  getUserPrevileges,
  updateUserPrevileges,
};
