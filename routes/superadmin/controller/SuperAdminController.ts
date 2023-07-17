export async function executeQueryController(req: any, res: any) {
  try {
    var connection = req.db;
    connection.query(
      req.body.query,
      [],
      (err: any, result: any, fields: any) => {
        if (err) {
          throw err;
        } else {
          res.send({
            status: "success",
            message: "Query Executed Successfully",
            data: req.body.query.includes("select") ? result : [],
          });
        }
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({
      status: "failed",
      message: "Something went wrong",
      data: [],
    });
  }
}

export async function authController(req: any, res: any) {
  res.status(200).send({
    status: "success",
    message: "Authenticated User",
  });
}
