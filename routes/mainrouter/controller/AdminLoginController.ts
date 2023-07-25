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
    
}

export function postNewManager(req : any, res : any) {
    
} 