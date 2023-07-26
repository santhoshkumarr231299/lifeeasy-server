import { deleteUserSession } from "../../util/AuthUtil";

export function getUsers(req: any, res: any) {
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

export function getUserPrevileges(req: any, res: any) {
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
        res.status(200).send({
          status: "success",
          message: "User Previlges",
          userPrevileges: result[0].have_access_to,
          userStatus: result[0].status == 1 ? true : false,
        });
      }
    }
  );
}

export function updateUserPrevileges(req : any, res : any) {
  try {
    let connection = req.connection;
    let session = req.session;
    if (session[req.headers.authorization].role !== 1) {
      res.status(200).send({
        status: "error",
        message: "Authorization Failed",
      });
      return;
    }
    let query : string;
    let list : any[];
    if (req.body.userStatus) {
      query =
        "update users set have_access_to = ?, last_accessed = ?, status = 1 where username = ?";
      list = [
        req.body.userPrevileges,
        req.body.lastAccessedScreen,
        req.body.username,
      ];
    } else {
      query = "update users set status = 0 where username = ?";
      list = [req.body.username];
    }
    connection.query(query, list, (err : any, result : any, fields : any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!req.body.userStatus) {
          deleteUserSession(req.body.username, session);
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

export function postNewManager(req : any, res : any) {
    
} 