const bcrypt = require("bcrypt");

export function getReports(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select * from reports where username in (select u.username from users u where pharmacy_name = (select uu.pharmacy_name from users uu where username = ?)) order by reported_date desc",
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      let data: any = [];
      let count = 1;
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      result.map((report: any) => {
        data.push({
          id: count++,
          reportTitle: report.report_title,
          reportSubject: report.report_subject,
          reportDesc: report.report_desc,
          reportDate: report.reported_date,
          reportedBy: report.username,
        });
      });
      res.status(200).send(data);
    }
  );
}

export function postReport(req: any, res: any) {
  let connection = req.connection;
  let session = req.session;
  var queryParam = [
    session[req.headers.authorization].username,
    session[req.headers.authorization].role,
    req.body.reportTitle,
    req.body.reportSubject,
    req.body.reportDesc,
  ];
  connection.query(
    "insert into reports (username, role, report_title, report_subject, report_desc, reported_date) values (?,?,?,?,?,NOW())",
    queryParam,
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "New User Values Updated successfully",
        });
      }
    }
  );
}

export function getInvoices(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select * from invoices where username = ? order by invoice_date desc",
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(err);
      }
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      let resp: any = [];
      result.map((data: any) => {
        resp.push({
          username: session[req.headers.authorization].username,
          pharmName: data.pharm_name,
          branch: data.branch,
          quantity: data.quantity,
          amount: data.amount,
          invoiceDate: data.invoice_date,
        });
      });
      res.status(200).send(resp);
    }
  );
}

export function postInvoice(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  var queryParam = [
    session[req.headers.authorization].username,
    req.body.pharmName,
    req.body.branch,
    req.body.quantity,
    req.body.amount,
  ];
  connection.query(
    "insert into invoices set username = ?, pharm_name = ?, branch = ?, quantity = ?, amount = ?, invoice_date = now()",
    queryParam,
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        res.status(200).send({
          status: "success",
          message: "New Invoice inserted successfully",
        });
      }
    }
  );
}

export function getDeliveryManDetails(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  var query =
    "select * from delivery_men where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ? ))";
  connection.query(
    query,
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let respData: any = [];
        result.map((data: any) => {
          respData.push({
            name: data.username,
            email: data.email,
            mobileNumber: data.mobile_number,
            address: data.address,
            aadhar: data.aadhar_number,
          });
        });
        res.status(200).send(respData);
      }
    }
  );
}

export function postDeliveryManDetail(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  var queryParam = [
    req.body.name,
    req.body.email,
    req.body.mobileNumber,
    req.body.address,
    req.body.aadhar,
    session[req.headers.authorization].username,
    session[req.headers.authorization].pharmacy,
  ];
  connection.query(
    "insert into delivery_men set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?, pharmacy_name = ?",
    queryParam,
    async (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        const hashedPassword = await bcrypt.hash("deliveryman", 10);
        var queryParam1 = [
          req.body.name,
          hashedPassword,
          req.body.mobileNumber,
          session[req.headers.authorization].username,
          req.body.email,
          session[req.headers.authorization].username,
          "[12]",
          session[req.headers.authorization].pharmacy,
          1,
          session[req.headers.authorization].pharmacy,
          1,
        ];
        connection.query(
          "insert into users set username = ?, password = ?, role = 6, last_accessed = 12,  mobile_number = ?,branch_id = (select u.branch_id from users u where u.username = ?), email = ?, pharmacy_name = (select u.pharmacy_name from users u where u.username = ?), have_access_to = ?, subscription_pack = (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), date_of_subscription = (select uuuu.date_of_subscription from users uuuu where pharmacy_name = ? and role = ?)",
          queryParam1,
          (err1: any, result1: any, fields1: any) => {
            if (err1) {
              console.log(err1);
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              res.status(200).send({
                status: "success",
                message: "New Delivery Man details inserted successfully",
              });
            }
          }
        );
      }
    }
  );
}

export function getPhamacistsDetails(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  var query = "select * from pharmacists where added_by = ?";
  connection.query(
    query,
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else {
        if (!result || result.length === 0) {
          res.status(200).send([]);
          return;
        }
        let respData: any = [];
        result.map((data: any) => {
          respData.push({
            name: data.username,
            email: data.email,
            mobileNumber: data.mobile_number,
            address: data.address,
            aadhar: data.aadhar_number,
          });
        });
        res.status(200).send(respData);
      }
    }
  );
}

export function postPharmacistDetails(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select count(*) as total from users where username = ?",
    [req.body.name],
    (err3: any, result3: any, fields3: any) => {
      if (err3) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else if (result3[0].total > 0) {
        res.status(200).send({
          status: "warning",
          message: "Username already exists",
        });
      } else {
        var queryParam = [
          req.body.name,
          req.body.email,
          req.body.mobileNumber,
          req.body.address,
          req.body.aadhar,
          session[req.headers.authorization].username,
          session[req.headers.authorization].pharmacy,
          1,
          session[req.headers.authorization].pharmacy,
          1,
        ];
        connection.query(
          "insert into pharmacists set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?",
          queryParam,
          async (err: any, result: any, fields: any) => {
            if (err) {
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              const hashedPassword = await bcrypt.hash("pharmacist", 10);
              var queryParam1 = [
                req.body.name,
                hashedPassword,
                3,
                11,
                req.body.email,
                session[req.headers.authorization].username,
                session[req.headers.authorization].username,
                req.body.mobileNumber,
                "[11]",
                session[req.headers.authorization].pharmacy,
                1,
                session[req.headers.authorization].pharmacy,
                1,
              ];
              connection.query(
                "insert into users (username, password, role,last_accessed, email,pharmacy_name,branch_id, mobile_number, have_access_to, subscription_pack, date_of_subscription) values (?,?,?,?,?,(select u.pharmacy_name from users u where username = ?),(select u.branch_id from users u where username = ?),?,?, (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), (select uuuu.date_of_subscription from users uuuu where pharmacy_name = ? and role = ?))",
                queryParam1,
                (err1: any, result1: any, fields1: any) => {
                  if (err1) {
                    console.log(err1);
                    res.status(200).send({
                      status: "error",
                      message: "Something went wrong",
                    });
                  } else {
                    res.status(200).send({
                      status: "success",
                      message: "New Pharmacist details inserted successfully",
                    });
                  }
                }
              );
            }
          }
        );
      }
    }
  );
}

export function getManagers(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select * from managers where pharmacy_name = (select u.pharmacy_name from users u where u.username = ?) ",
    [session[req.headers.authorization].username],
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
        let data: any = [];
        result.forEach((element: any) => {
          data.push({
            username: element.username,
            email: element.email,
            branch: element.branch_id,
            address: element.address,
          });
        });
        res.status(200).send(data);
      }
    }
  );
}

export async function postManager(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  if (session[req.headers.authorization].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    });
    return;
  }
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  var queryParam1 = [
    req.body.username,
    hashedPassword,
    req.body.email,
    session[req.headers.authorization].username,
    req.body.branch,
    req.body.mobileNumber,
    session[req.headers.authorization].pharmacy,
    1,
    session[req.headers.authorization].pharmacy,
    1,
  ];
  connection.query(
    "insert into users (username, password, role, last_accessed,email,pharmacy_name, branch_id, mobile_number, have_access_to, subscription_pack, date_of_subscription) values (?,?,4,1,?,(select uuu.pharmacy_name from users uuu where uuu.username = ?),?, ?, '[1][2][4][6][7][9]', (select uuuu.subscription_pack from users uuuu where pharmacy_name = ? and role = ?), (select uuuuu.date_of_subscription from users uuuuu where pharmacy_name = ? and role = ?))",
    queryParam1,
    (err1: any, result1: any, fields1: any) => {
      if (err1) {
        console.log(err1);
        res.status(200).send({
          status: "error",
          message: "Failed to insert Manager",
        });
      } else {
        var queryParam = [
          req.body.username,
          hashedPassword,
          req.body.email,
          req.body.username,
          req.body.address,
          session[req.headers.authorization].username,
        ];
        connection.query(
          "insert into managers (username, password, email, branch_id, address, pharmacy_name) values (?,?,?,(select u.branch_id from users u where u.username = ?),?, (select uuu.pharmacy_name from users uuu where uuu.username = ?))",
          queryParam,
          (err: any, result: any, fields: any) => {
            if (err) {
              console.log(err);
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else {
              res.status(200).send({
                status: "success",
                message: "Manager details inserted successfully",
              });
            }
          }
        );
      }
    }
  );
}
