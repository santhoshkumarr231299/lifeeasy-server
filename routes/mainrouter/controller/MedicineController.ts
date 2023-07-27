function getMedicines(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select * from medicines where added_by in (select u.username from users u where u.pharmacy_name = (select distinct us.pharmacy_name from users us where username = ?))",
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      let data: any = [];
      result.map((mdata: any) => {
        data.push({
          mid: mdata.mid,
          mname: mdata.mname,
          mcompany: mdata.mcompany,
          quantity: mdata.quantity,
          dateAdded: mdata.med_added_date,
          expiryDate: mdata.expiry_date,
          medMrp: mdata.med_mrp,
          medRate: mdata.med_rate,
          addedBy: mdata.added_by,
          status: "1" === mdata.status ? "ACTIVE" : "INACTIVE",
        });
      });
      res.status(200).send(data);
    }
  );
}

function postMedicines(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  var sizeOfMed = 1;
  connection.query(
    "select max(mid) as total from medicines",
    [session[req.headers.authorization].username],
    (err1: any, result1: any, fields1: any) => {
      if (err1) {
        console.log(err1);
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
        return;
      } else {
        sizeOfMed = +result1[0].total + 1;

        connection.query(
          "select count(mid) as total from medicines m inner join users u on m.added_by = u.username where u.pharmacy_name = ? and m.mname = ?",
          [session[req.headers.authorization].pharmacy, req.body.medName],
          (err3: any, result3: any, fields3: any) => {
            if (err3) {
              console.log(err3);
              res.status(200).send({
                status: "error",
                message: "Something went wrong",
              });
            } else if (+result3[0].total > 0) {
              res.status(200).send({
                status: "warning",
                message: `${req.body.medName} name already exists...`,
              });
              return;
            } else {
              var queryParam = [
                session[req.headers.authorization].username,
                sizeOfMed,
                req.body.medName,
                req.body.medCompany,
                req.body.medQuantity,
                req.body.medExpiryDate,
                req.body.medMrp,
                req.body.medRate,
                req.body.medStatus === "ACTIVE" ? "1" : "0",
                session[req.headers.authorization].username,
              ];

              connection.query(
                "insert into medicines (username, mid, mname, mcompany, quantity, expiry_date, med_mrp, med_rate, status, added_by) values (?,?,?,?,?,?,?,?,?,?)",
                queryParam,
                (err: any, result: any, fields: any) => {
                  console.log;
                  if (err) {
                    console.log(err);
                    res.status(200).send({
                      status: "error",
                      message: "Something went wrong",
                    });
                  } else {
                    res.status(200).send({
                      status: "success",
                      message: "New Medicine Added Successfully",
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

function getSearchMedicines(req: any, res: any) {
  let connection = req.db;
  let tsearchWord = "%" + req.body.searchWord + "%";
  connection.query(
    "select m.mid, m.mname, m.mcompany, m.quantity, m.med_added_date, m.expiry_date, m.med_mrp, m.med_rate, m.added_by, u.pharmacy_name from medicines m inner join users u on m.added_by = u.username where mname like ? order by mname limit 16",
    [tsearchWord],
    (err: any, result: any, fields: any) => {
      if (!result || result.length === 0) {
        res.status(200).send([]);
        return;
      }
      let data: any = [];
      let counter = 0;
      result.map((mdata: any) => {
        data.push({
          id: ++counter,
          mid: mdata.mid,
          mname: mdata.mname,
          mcompany: mdata.mcompany,
          pharmacy: mdata.pharmacy_name,
          quantity: mdata.quantity,
          dateAdded: mdata.med_added_date,
          expiryDate: mdata.expiry_date,
          medMrp: mdata.med_mrp,
          medRate: mdata.med_rate,
          addedBy: mdata.added_by,
          status: "1" === mdata.status ? "ACTIVE" : "INACTIVE",
        });
      });
      res.status(200).send(data);
    }
  );
}

module.exports = {
  getMedicines,
  postMedicines,
  getSearchMedicines,
};
