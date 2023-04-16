var express = require('express');
var app = express();
var cors = require('cors');
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
const mysql2 = require('mysql2')
var nodemailer = require('nodemailer');
const Razorpay = require("razorpay");
const schdule = require("node-schedule");
require('dotenv').config();

var transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE_NAME,
  auth: {
    user: process.env.MAIL_AUTH_USERNAME,
    pass: process.env.MAIL_AUTH_PASSWORD,
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  credentials : true,
}))

// var connection = mysql.createPool({
//   connectionLimit : 10,
//   port : 3306,
//   host: 'localhost',
//   user: 'root',
//   password: '#' + process.env.DB_LOCAL_PASSWORD,
//   database: 'pharmacy_management'
// })

var connection = mysql2.createPool(process.env.PLANETSCALE_DATABASE_URL);

// var connection = mysql.createPool({
//   connectionLimit : 10,
//   host: process.env.DB_HOST_NAME,
//   port: process.env.DB_PORT_NUMBER,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE_NAME,
// })

var session = new Map();

var otpRecords = new Map();


schdule.scheduleJob('0 * * * *', () => {
  console.log("Deleting OTP Records...");
  for(let entry of Object.entries(otpRecords)) {
    delete otpRecords[entry[0]];
  }
});

schdule.scheduleJob('0 3 * * *', () => {
  console.log("Deleting Sessions...");
  for(let entry of Object.entries(session)) {
    delete session[entry[0]];
  }
});

app.use(function (req,res,next) {
  next();
})

app.post("/check-username", (req,res) => {
  try {
    connection.query('select (select count(username) from users where username = ?) as username_count, (select count(email) from users where email = ?) as email_count, (select count(mobile_number) from users where mobile_number = ?) as mobile_number_count', [req.body.username,req.body.email, req.body.mobileNumber], (err, result, fields) => {
      if(!result || ((+result[0].username_count) === 0 && (+result[0].email_count) === 0 && (+result[0].mobile_number_count) === 0)) {
        res.status(200).send({
          status : "success",
          message : "Details not found"
        })
        return ;
      }
      else if((+result[0].username_count) > 0) {
        res.status(200).send({
          status : "warning",
          message : "Username already exists..."
        })
        return ;
      }
      else if((+result[0].email_count) > 0) {
        res.status(200).send({
          status : "warning",
          message : "Email already exists..."
        })
        return ;
      }
      else if((+result[0].mobile_number_count) > 0) {
        res.status(200).send({
          status : "warning",
          message : "Mobile Number already exists..."
        })
        return ;
      }
      else {
        res.status(200).send({
          status : "success",
          message : "Details not found"
        })
        return ;
      }
    })
  } catch(err) {
    console.log(err);
    res.status(500).send({
      status : "error",
      message : "Something went wrong"
    })
  }
})

app.post('/logged-in', (req, res) => {
  try {
    if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
      res.status(200).send({
        username: "",
      })
      return;
    }
    connection.query("select * from users where username = ?", [session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
      if (result && result.length === 1) {
        res.status(200).send({
          username: session[req.body.secretKey].username,
          role: session[req.body.secretKey].role,
          lastAccessedScreen: result[0].last_accessed,
          haveAccessTo: result[0].have_access_to,
          pharmacy: session[req.body.secretKey].pharmacy,
          subscriptionPack : result[0].subscription_pack,
          DateOfSubscription : result[0].date_of_subscription,
        })
      } else {
        res.status(200).send({
          username: "",
        })
      }
    });
  }
  catch (e) {
    console.log(e);
    res.status(200).send({
      username: '',
      password: ''
    })
  }
})

app.post('/login', (req, res) => {
  try {
    connection.query('select * from users where username = ?', [req.body.username, req.body.password, req.body.pharmacy], (err, result, fields) => {
      if (result && result.length == 1) {
        let username = result[0].username;
        let password = result[0].password;
        if(username == req.body.username) {
          if(password == req.body.password) {
              const secretKey = uuidv4();
              var validatedUser = {
                username: result[0].username,
                role: result[0].role,
                lastAccessedScreen: result[0].last_accessed,
                pharmacy: result[0].pharmacy_name,
                secretKey: secretKey,
                subscriptionPack : result[0].subscription_pack,
                DateOfSubscription : result[0].date_of_subscription,
                message: 'success'
              };
              session[secretKey] = validatedUser;
              console.log(`user logged in : `, validatedUser.username);
              res.send(validatedUser);
          } else {
            res.status(200).send({
              username: '',
              role: '',
              lastAccessedScreen: 0,
              message: 'failed',
              comment : 'Username - Password Mismatch'
            })
          }
        } else {
          res.status(200).send({
            username: '',
            role: '',
            lastAccessedScreen: 0,
            message: 'failed',
            comment : 'Username does not Exist'
          })
        }
      } else {
        res.status(200).send({
          username: '',
          role: '',
          lastAccessedScreen: 0,
          message: 'failed',
          comment : 'Username does not Exist'
        })
      }
    })
  } catch(e) {
    console.log('/login : ', e);
    res.status(200).send({
      username: '',
      role: '',
      lastAccessedScreen: 0,
      message: 'failed',
      comment : 'Failed to Login - try again later'
    })
  }
});

app.post('/new-user', (req, res) => {
  connection.query('select * from users where username = ?', [req.body.username], (err, result, fields) => {
    let date = new Date();
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "danger",
        message: "Something went wrong"
      })
    }
    else if (result.length > 0) {
      res.status(200).send({
        status: "danger",
        message: "Username already exists"
      })

    }
    else if (!otpRecords[req.body.secretKey] || !otpRecords[req.body.secretKey].mail) {
      res.status(200).send({
        status: "error",
        message: "Verify your email..."
      })
      return;
    } 
    else if (otpRecords[req.body.secretKey].mail !== req.body.email) {
      delete otpRecords[req.body.secretKey];
      res.status(200).send({
        status: "error",
        message: "Verify your email..."
      })
      return;
    }
    else if (otpRecords[req.body.secretKey].minute > date.getMinutes()) {
      if (date.getMinutes + (60 - otpRecords[req.body.secretKey].minute) > 5) {
        delete otpRecords[req.body.secretKey];
        res.status(200).send({
          status: "error",
          message: "OTP expired"
        })
        return;
      }
    } else if (otpRecords[req.body.secretKey].minute < date.getMinutes()) {
      if (date.getMinutes() - otpRecords[req.body.secretKey].minute > 5) {
        delete otpRecords[req.body.secretKey];
        res.status(200).send({
          status: "error",
          message: "OTP expired"
        })
        return;
      }
    } else if (otpRecords[req.body.secretKey].otp !== req.body.otp) {
        res.status(200).send({
          status: "error",
          message: "Invalid OTP"
        })
        return;
    }
    else {
      connection.query('insert into users (username, password, role, last_accessed,email,mobile_number, pharmacy_name,branch_id,have_access_to) values (?,?,?,?,?,?,?,?,?)', [req.body.username, req.body.password, req.body.pharmacyName && req.body.pharmacyName.trim() !== '' ? 1 : 2, req.body.pharmacyName && req.body.pharmacyName.trim() !== '' ? 1 : 8, req.body.email, req.body.mobileNumber, req.body.pharmacyName, req.body.pharmacyName && req.body.pharmacyName.trim() !== '' ? 1 : -1, req.body.pharmacyName && req.body.pharmacyName.trim() !== '' ? '[1],[2],[3],[4],[5],[6],[7],[9][10]' : '[8]'], (err1, result1, fields1) => {
        if (err1) {
          console.log(err1);
          res.status(200).send({
            status: "danger",
            message: "Something went wrong"
          })
        } else {
          try {
            var mailOptions = {
              from: 'PharmSimple <security-alert@pharmsimple.com>',
              to: otpRecords[req.body.secretKey].mail,
              subject: 'Congratulations',
              text: 'Your PharmSimple ' + (req.body.pharmacyName === "" ? "" : "Management ") + 'Account has been Created Successfully',
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                res.status(200).send({
                  status: "error",
                  message: "Enter a valid email"
                })
                return;
              } else {
                console.log('Email sent: ' + req.body.email);
              }
            });

            delete otpRecords[req.body.secretKey];

            res.status(200).send({
              status: 'success',
              message: "New User Created"
            })
          } catch (ex) {
            console.log('Exception while creating new user', ex);
            res.status(200).send({
              status: 'error',
              message: "Something went wrong"
            })
          }
        }
      })
    }
  })
})

app.post('/get-medicines', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send([]);
    return;
  }
  connection.query('select * from medicines where added_by in (select u.username from users u where u.pharmacy_name = (select distinct us.pharmacy_name from users us where username = ?))', [session[req.body.secretKey].username], (err, result, fields) => {
    if (!result || (result.length === 0)) {
      res.status(200).send([]);
      return;
    }
    let data = [];
    result.map((mdata) => {
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
        status: ('1' === mdata.status ? 'ACTIVE' : 'INACTIVE'),
      });
    })
    res.status(200).send(data);
  });
})

app.post('/post-medicine', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var sizeOfMed = 1;
  connection.query('select max(mid) as total from medicines', [session[req.body.secretKey].username], (err1, result1, fields1) => {
    if(err1) {
      console.log(err1);
        res.status(200).send({
          status: "error",
          message: "Something went wrong"
        })
        return ;
    }
    else {

      sizeOfMed = (+result1[0].total) + 1;

      connection.query('select count(mid) as total from medicines m inner join users u on m.added_by = u.username where u.pharmacy_name = ? and m.mname = ?', [session[req.body.secretKey].pharmacy,req.body.medName], (err3, result3, fields3) => {
        if(err3) {
          console.log(err3);
          res.status(200).send({
            status: "error",
            message: "Something went wrong"
          })
        }
        else if((+result3[0].total) > 0) {
          res.status(200).send({
            status: "warning",
            message: `${req.body.medName} name already exists...`
          })
          return ;
        }
        else {
          var queryParam = [session[req.body.secretKey].username, sizeOfMed, req.body.medName, req.body.medCompany, req.body.medQuantity, req.body.medExpiryDate, req.body.medMrp, req.body.medRate, (req.body.medStatus === 'ACTIVE' ? '1' : '0'), session[req.body.secretKey].username];
  
          connection.query("insert into medicines (username, mid, mname, mcompany, quantity, expiry_date, med_mrp, med_rate, status, added_by) values (?,?,?,?,?,?,?,?,?,?)", queryParam, (err, result, fields) => {
            console.log
            if (err) {
              console.log(err);
              res.status(200).send({
                status: "error",
                message: "Something went wrong"
              })
            }
            else {
              res.status(200).send({
                status: "success",
                message: "New Medicine Added Successfully"
              })
            }
          })
        }
      })
    }
  })

});

app.post('/logout', (req, res) => {
  try {
    delete session[req.body.secretKey];
  } catch (err) {

  }
  res.status(200).send({
    message: 'success'
  })
});


app.get('/', function (req, res) {
  res.send("You are not authorized...");
});

app.post('/update-last-accessed', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "failed",
      message: "authentication failed"
    })
    return;
  }
  connection.query('update users set last_accessed = ? where username = ? and pharmacy_name = ?', [req.body.lastAccessedScreen, session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    res.send({ message: "success" })
  });
})

app.post('/get-user-details', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select *  from users where username = ?', [req.body.username], (err, result, fields) => {
    if (result) {
      res.status(200).send({
        username: result[0].username,
        email: result[0].email,
        mobileNumber: result[0].mobile_number,
        pharmacyName: result[0].pharmacy_name,
        branchId: result[0].branch_id,
        message: "success"
      })
    }
    else {
      res.status(200).send({
        username: '',
        message: "success"
      })
    }
  })

})

app.post('/get-search-medicines', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send([])
    return;
  }
  let tsearchWord = '%' + req.body.searchWord + '%';
  connection.query('select m.mid, m.mname, m.mcompany, m.quantity, m.med_added_date, m.expiry_date, m.med_mrp, m.med_rate, m.added_by, u.pharmacy_name from medicines m inner join users u on m.added_by = u.username where mname like ? order by mname limit 16', [tsearchWord], (err, result, fields) => {
    if (!result || (result.length === 0)) {
      res.status(200).send([]);
      return;
    }
    let data = [];
    let counter = 0;
    result.map((mdata) => {
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
        status: ('1' === mdata.status ? 'ACTIVE' : 'INACTIVE'),
      });
    })
    res.status(200).send(data);
  })
});

app.post('/get-cart-items', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select medname, quantity, price, mid from cartitems where username = ? and is_ordered = 0', [session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (!result || (result.length === 0)) {
      res.status(200).send([]);
      return;
    }
    let data = [];
    let count = 1;
    result.map((item) => {
      data.push({
        id: count++,
        medName: item.medname,
        price: item.price,
        quantity: item.quantity,
        mid: item.mid
      })
    })
    res.status(200).send(data);
  })
})

app.post('/update-pass', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select username,email from users where username = ? and password = ? and pharmacy_name = ?', [session[req.body.secretKey].username, req.body.oldPass, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    if (result.length == 0) {
      console.log(result);
      res.status(200).send({
        status: "warning",
        message: "Wrong Old Password"
      })
    }
    else {
      let email = result[0].email;
      if (req.body.oldPass === req.body.newPass) {
        res.status(200).send({
          status: "warning",
          message: "New Password and Old Password are same"
        })
      }
      else {
        connection.query('update users set password = ? where username = ? and pharmacy_name = ?', [req.body.newPass, session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
          if (err) {
            res.status(200).send({
              status: "error",
              message: "Something went wrong"
            })

          }
          else {
            var mailOptions = {
              from: 'PharmSimple <security-alert@pharmsimple.com>',
              to: email,
              subject: 'Password Changed',
              text: 'The Password of Your Account has been Changed',
            };
      
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log("Password changed : " + email);
              }
            });
            res.status(200).send({
              status: "success",
              message: "New Password Updated Successfully"
            })
          }
        })
      }
    }
  });

});

app.post("/security/verify-email", (req, res) => {

  if (!req.body.email) {
    res.status(200).send({
      status: "error",
      message: "Email cannot be Empty"
    })
    return;
  }

  connection.query("select email from users where email = ?", [req.body.email], (err, result, fields) => {

    if (!(!result || result.length === 0)) {
      res.status(200).send({
        status: "error",
        message: "Email already exists"
      })
      return;
    }
    else {
      let date = new Date();

      const secretKey = uuidv4();

      console.log(result);

      otpRecords[secretKey] = {
        mail: req.body.email,
        otp: Math.floor(Math.random() * 9000 + 1000).toString(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }

      var mailOptions = {
        from: 'PharmSimple <security-alert@pharmsimple.com>',
        to: req.body.email,
        subject: 'Verify Your Email',
        text: 'PharmSimple Email Verfication OTP (valid for 5 minutes) : ' + otpRecords[secretKey].otp,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          res.status(200).send({
            status: "error",
            message: "Enter a valid email"
          })
          return;
        } else {
          console.log('Email sent: ' + req.body.email);
          res.status(200).send({
            status: "success",
            message: "OTP has been sent to the Mail if exists...",
            secretKey: secretKey,
          })
        }
      });
    }
  })

})

app.post("/security/generate-email", (req, res) => {

  if (!req.body.username) {
    res.status(200).send({
      status: "error",
      message: "Username cannot be Empty"
    })
    return;
  }

  connection.query("select email from users where username = ?", [req.body.username], (err, result, fields) => {

    if (!result || result.length === 0) {
      res.status(200).send({
        status: "error",
        message: "Username does not exits"
      })
      return;
    }
    else {
      let date = new Date();

      const secretKey = uuidv4();

      otpRecords[secretKey] = {
        mail: result[0].email,
        otp: Math.floor(Math.random() * 9000 + 1000).toString(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }

      var mailOptions = {
        from: 'PharmSimple <security-alert@pharmsimple.com>',
        to: result[0].email,
        subject: 'Verify Your Account',
        text: 'PharmSimple Account Verfication OTP (valid for 5 minutes) : ' + otpRecords[secretKey].otp,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          res.status(200).send({
            status: "error",
            message: "User does not have a valid email"
          })
          return;
        } else {
          console.log('Email sent: ' + result[0].email);
          res.status(200).send({
            status: "success",
            message: "OTP has been sent to the Associated Mail",
            secretKey: secretKey,
          })
        }
      });
    }
  })

})

app.post("/forgot-pass-change", (req, res) => {
try {
  let date = new Date();
  if (otpRecords[req.body.secretKey].minute > date.getMinutes()) {
    if (date.getMinutes + (60 - otpRecords[req.body.secretKey].minute) > 5) {
      delete otpRecords[req.body.secretKey];
      res.status(200).send({
        status: "error",
        message: "OTP expired"
      })
      return;
    }
  } else if (!req.body.secretKey || !otpRecords[req.body.secretKey]) {
    delete otpRecords[req.body.secretKey];
    res.status(200).send({
      status: "error",
      message: "OTP expired"
    })
    return;
  }
  else if (!otpRecords[req.body.secretKey] || !otpRecords[req.body.secretKey].mail) {
    delete otpRecords[req.body.secretKey];
    res.status(200).send({
      status: "error",
      message: "Verify your email..."
    })
    return;
  } 
  else if (otpRecords[req.body.secretKey].minute < date.getMinutes()) {
    if (date.getMinutes() - otpRecords[req.body.secretKey].minute > 5) {
      res.status(200).send({
        status: "error",
        message: "OTP expired"
      })
      return;
    }
  } else if (otpRecords[req.body.secretKey].otp !== req.body.otp) {
      res.status(200).send({
        status: "error",
        message: "Invalid OTP"
      })
      return;
  }else {
      connection.query('update users set password = ? where username = ?', [req.body.newPass, req.body.username], (err, result, fields) => {

        if (err) {
          res.status(200).send({
            status: "error",
            message: "Something went wrong"
          })
        } 
        else {

          var mailOptions = {
            from: 'PharmSimple <security-alert@pharmsimple.com>',
            to: otpRecords[req.body.secretKey].mail,
            subject: 'Security Alert',
            text: 'Your PharmSimple Account Password has been Changed',
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              res.status(200).send({
                status: "error",
                message: "Enter a valid email"
              })
              return;
            } else {
              console.log('Email sent: ' + info.response);
            }
          });

          delete otpRecords[req.body.secretKey];

          res.status(200).send({
            status: "success",
            message: "Password has been Changed"
          })
        }
      })
   } 
    }catch(err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
})

app.post("/update-user-details", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username || session[req.body.secretKey].username !== req.body.username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var queryParam = [req.body.email, req.body.mobileNumber, req.body.branchId, session[req.body.secretKey].username];
  connection.query('update users set email = ?, mobile_number = ?, branch_id = ?  where username = ?', queryParam, (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else if (result.changedRows == 0) {
      res.status(200).send({
        status: "warning",
        message: "User Values are the same before"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: "New User Values Updated successfully"
      })
    }
  });

})

app.post("/get-reports", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select * from reports where username in (select u.username from users u where pharmacy_name = (select uu.pharmacy_name from users uu where username = ?)) order by reported_date desc', [session[req.body.secretKey].username], (err, result, fields) => {
    let data = [];
    let count = 1;
    if (!result || (result.length === 0)) {
      res.status(200).send([]);
      return;
    }
    result.map((report) => {
      data.push({
        id: count++,
        reportTitle: report.report_title,
        reportSubject: report.report_subject,
        reportDesc: report.report_desc,
        reportDate: report.reported_date,
        reportedBy: report.username,
      })
    })
    res.status(200).send(data);
  })
});

app.post("/post-report", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var queryParam = [session[req.body.secretKey].username, session[req.body.secretKey].role, req.body.reportTitle, req.body.reportSubject, req.body.reportDesc];
  connection.query('insert into reports (username, role, report_title, report_subject, report_desc, reported_date) values (?,?,?,?,?,NOW())', queryParam, (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: "New User Values Updated successfully"
      })
    }
  })
})

app.post('/get-cart-items-count', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select count(username) as total from cartitems where username = ? and is_ordered = 0', [session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    res.status(200).send({
      cartSize: result[0].total,
      message: 'success'
    })
  })
})

app.post('/update-cart-items', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('update cartitems set quantity = ? where username = ? and mid = ?', [req.body.newQuantity, session[req.body.secretKey].username, req.body.mid], (err, result, fields) => {
    if(err) {
      console.log(session[req.body.secretKey].username + " - Error : " + err);
      res.status(500).send({
        status : "failed",
        message : "Error"
      })
    }
    else {
      res.status(200).send({
        status : "success",
        message : "Item deleted Successfully"
      })
    }
  })
})

app.post('/delete-cart-items', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('delete from cartitems where username = ? and mid = ?', [session[req.body.secretKey].username, req.body.mid], (err, result, fields) => {
    if(err) {
      console.log(session[req.body.secretKey].username + " - Error : " + err);
      res.status(500).send({
        status : "failed",
        message : "Error"
      })
    }
    else {
      res.status(200).send({
        status : "success",
        message : "Item deleted Successfully"
      })
    }
  })
})

app.post('/get-invoices', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select * from invoices where username = ? order by invoice_date desc', [session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      console.log(err);
    }
    if (!result || (result.length === 0)) {
      res.status(200).send([]);
      return;
    }
    let resp = [];
    result.map((data) => {
      resp.push({
        username: session[req.body.secretKey].username,
        pharmName: data.pharm_name,
        branch: data.branch,
        quantity: data.quantity,
        amount: data.amount,
        invoiceDate: data.invoice_date,
      });
    })
    res.status(200).send(resp);
  })
})

app.post('/post-invoice', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var queryParam = [session[req.body.secretKey].username, req.body.pharmName, req.body.branch, req.body.quantity, req.body.amount];
  connection.query('insert into invoices set username = ?, pharm_name = ?, branch = ?, quantity = ?, amount = ?, invoice_date = now()', queryParam, (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: "New Invoice inserted successfully"
      })
    }
  })
})

app.post('/get-delivery-men-details', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var query = 'select * from delivery_men where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ? ))';
  connection.query(query, [session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let respData = [];
      result.map((data) => {
        respData.push({
          name: data.username,
          email: data.email,
          mobileNumber: data.mobile_number,
          address: data.address,
          aadhar: data.aadhar_number,
        })
      })
      res.status(200).send(respData);
    }
  })
})

app.post('/post-delivery-man-details', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  var queryParam = [req.body.name, req.body.email, req.body.mobileNumber, req.body.address, req.body.aadhar, session[req.body.secretKey].username, session[req.body.secretKey].pharmacy];
  connection.query('insert into delivery_men set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?, pharmacy_name = ?', queryParam, (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else {
      var queryParam1 = [req.body.name, "deliveryman", req.body.mobileNumber, session[req.body.secretKey].username, req.body.email, session[req.body.secretKey].username, '[12]'];
      connection.query('insert into users set username = ?, password = ?, role = 6, last_accessed = 12,  mobile_number = ?,branch_id = (select u.branch_id from users u where u.username = ?), email = ?, pharmacy_name = (select u.pharmacy_name from users u where u.username = ?), have_access_to = ?', queryParam1, (err1, result1, fields1) => {
        if (err1) {
          console.log(err1);
          res.status(200).send({
            status: "error",
            message: "Something went wrong"
          })
        }
        else {
          res.status(200).send({
            status: "success",
            message: "New Delivery Man details inserted successfully"
          })
        }
      })
    }
  })
})

app.post('/get-pharmacists-details', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send([])
    return;
  }
  var query = 'select * from pharmacists where added_by = ?';
  connection.query(query, [session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let respData = [];
      result.map((data) => {
        respData.push({
          name: data.username,
          email: data.email,
          mobileNumber: data.mobile_number,
          address: data.address,
          aadhar: data.aadhar_number,
        })
      })
      res.status(200).send(respData);
    }
  })
})

app.post('/post-pharmacist-details', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  connection.query('select count(*) as total from users where username = ?', [req.body.name], (err3, result3, fields3) => {
    if (err3) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else if (result3[0].total > 0) {
      res.status(200).send({
        status: "warning",
        message: "Username already exists"
      })
    } else {
      var queryParam = [req.body.name, req.body.email, req.body.mobileNumber, req.body.address, req.body.aadhar, session[req.body.secretKey].username];
      connection.query('insert into pharmacists set username = ?, email = ?, mobile_number = ?, address = ?, aadhar_number = ?, added_by = ?', queryParam, (err, result, fields) => {
        if (err) {
          res.status(200).send({
            status: "error",
            message: "Something went wrong"
          })
        }
        else {
          var queryParam1 = [req.body.name, 'pharmacist', 3, 11, req.body.email, session[req.body.secretKey].username, session[req.body.secretKey].username, req.body.mobileNumber, '[11]'];
          connection.query('insert into users (username, password, role,last_accessed, email,pharmacy_name,branch_id, mobile_number, have_access_to) values (?,?,?,?,?,(select u.pharmacy_name from users u where username = ?),(select u.branch_id from users u where username = ?),?,?)', queryParam1, (err1, result1, fields1) => {
            if (err1) {
              res.status(200).send({
                status: "error",
                message: "Something went wrong"
              })
            }
            else {
              res.status(200).send({
                status: "success",
                message: "New Pharmacist details inserted successfully"
              })
            }
          })
        }
      })
    }
  })
})


app.post('/add-to-cart', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed"
    })
    return;
  }
  let query = 'select count(*) as total from cartitems where username = ? and medname = ? and is_ordered = 0 and mid = ?';
  let queryParam = [session[req.body.secretKey].username, req.body.medName, req.body.mid];

  connection.query(query, queryParam, (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      })
    }
    else if (result[0].total > 0) {
      res.status(200).send({
        status: "warning",
        message: `${req.body.medName} is already in cart...`,
      })
    }
    else {      
        connection.query('insert into cartitems (mid, username, medname, quantity, price,pharm_name) values (?,?, ?, ?, (select m.med_rate from medicines m where mid = ?), (select distinct u.pharmacy_name from users u where u.username in (select distinct uu.added_by from medicines uu where uu.mname = ?)))', [req.body.mid, session[req.body.secretKey].username, req.body.medName,req.body.quantity, req.body.mid, req.body.medName], (err2, result2, fields2) => {
          if (err2) {
            console.log(err2);
            res.status(200).send({
              status: "error",
              message: "Something went wrong"
            })
          }
          else {
            res.status(200).send({
              status: "success",
              message: `${req.body.medName} is added to Cart`
            })
          }
        })
    }
  })
})

app.get('/get-created-pharmacies', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
      pharmacies: [],
    })
    return;
  }
  connection.query('select distinct pharmacy_name from users order by pharmacy_name asc', (err, result, fields) => {
    let list = [];
    result.map((data) => {
      list.push(data.pharmacy_name);
    })
    res.status(200).send({
      status: "success",
      pharmacies: list,
    })
  })
})

app.post('/get-users', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
      users: [],
    })
    return;
  }
  else if (session[req.body.secretKey].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed"
    })
    return;
  }
  let searchPattern = '%' + req.body.search + '%';
  connection.query('select username from users where pharmacy_name = (select u.pharmacy_name from users u where u.username = ? ) and role <> 1 and username like ?', [session[req.body.secretKey].username, searchPattern], (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      });
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send({
          status: "success",
          message: "Users",
          users: [],
        })
        return;
      }
      let usersTemp = [];
      result.map((user) => usersTemp.push(user));
      res.status(200).send({
        status: "success",
        message: "Users",
        users: usersTemp,
      })
    }
  });
})

app.post('/get-user-previleges', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
      pharmacies: [],
    })
    return;
  }
  if (session[req.body.secretKey].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed"
    })
    return;
  }
  connection.query('select have_access_to from users where username = ?', [req.body.username], (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong"
      });
    }
    else {
      res.status(200).send({
        status: "success",
        message: "User Previlges",
        userPrevileges: result[0].have_access_to,
      })
    }
  });
})

app.post('/update-user-previleges', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
      pharmacies: [],
    })
    return;
  }
  else if (session[req.body.secretKey].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed"
    })
    return;
  }
  connection.query('update users set have_access_to = ?, last_accessed = ? where username = ?', [req.body.userPrevileges, req.body.lastAccessedScreen, req.body.username], (err, result, fields) => {
    if (err) {
      res.status(200).send({
        status: "error",
        message: "Something went wrong",
      })
    }
    else if (result.changedRows == 0) {
      res.status(200).send({
        status: "warning",
        message: "User Previleges are the same before"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: "User Previleges Updated successfully"
      })
    }
  })
});

app.post("/get-managers", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('select * from managers where pharmacy_name = (select u.pharmacy_name from users u where u.username = ?) ', [session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let data = [];
      result.forEach(element => {
        data.push({
          username: element.username,
          email: element.email,
          branch: element.branch_id,
          address: element.address,
        });
      });
      res.status(200).send(data);
    }
  })
})

app.post("/post-new-manager", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  else if (session[req.body.secretKey].role !== 1) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed"
    })
    return;
  }
  var queryParam1 = [req.body.username, req.body.password, req.body.email, session[req.body.secretKey].username, req.body.branch, req.body.mobileNumber];
  connection.query("insert into users (username, password, role, last_accessed,email,pharmacy_name, branch_id, mobile_number, have_access_to) values (?,?,4,1,?,(select uuu.pharmacy_name from users uuu where uuu.username = ?),?, ?, '[1][2][4][6][7][9]')", queryParam1, (err1, result1, fields1) => {
    if (err1) {
      console.log(err1);
      res.status(200).send({
        status: "error",
        message: "Failed to insert Manager"
      })
    }
    else {
      var queryParam = [req.body.username, req.body.password, req.body.email, req.body.username, req.body.address, session[req.body.secretKey].username];
      connection.query('insert into managers (username, password, email, branch_id, address, pharmacy_name) values (?,?,?,(select u.branch_id from users u where u.username = ?),?, (select uuu.pharmacy_name from users uuu where uuu.username = ?))', queryParam, (err, result, fields) => {
        if (err) {
          console.log(err);
          res.status(200).send({
            status: "error",
            message: "Something went wrong"
          })
        }
        else {
          res.status(200).send({
            status: "success",
            message: "Manager details inserted successfully"
          })
        }
      })
    }

  })
})

app.post("/get-dashboard-details", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('select (select count(*) from managers where pharmacy_name = (select u.pharmacy_name from users u where username = ?)) as managers_count, (select count(*) from pharmacists where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ?))) as pharmacists_count, (select count(*) from delivery_men where pharmacy_name = ?) as delivery_men_count, (select count(*) from medicines where added_by in (select u.username from users u where u.pharmacy_name = (select uu.pharmacy_name from users uu where uu.username = ?))) as medicines_count', [session[req.body.secretKey].username, session[req.body.secretKey].username, session[req.body.secretKey].pharmacy, session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send({
          managersCount: 0,
          pharmacistsCount: 0,
          DeliveryMenCount: 0,
          medicinesCount: 0,
        });
        return;
      }
      res.status(200).send({
        managersCount: result[0].managers_count,
        pharmacistsCount: result[0].pharmacists_count,
        DeliveryMenCount: result[0].delivery_men_count,
        medicinesCount: result[0].medicines_count,
      });
    }
  })
})

app.post('/get-ordered-items-for-approval', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('select * from cartitems where is_ordered = 1 and pharm_name = ?', [session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let temp = [];
      result.forEach(element => {
        temp.push({
          username: element.username,
          mid : element.mid,
          mname: element.medname,
          quantity: element.quantity,
        })
      })
      res.status(200).send(temp);
    }
  })
})

app.post('/approve-order', (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  var queryParam1 = [req.body.username, req.body.mname, req.body.mid];
  connection.query("insert into approved_items (mid, username, medname, quantity,price, pharmacy_name) select ci.mid, ci.username, ci.medname, ci.quantity, ci.price, ci.pharm_name from cartitems ci where username = ? and medname = ? and mid = ? and is_ordered = 1", queryParam1, (err1, result1, fields1) => {
    if (err1) {
      console.log(err1);
      res.status(200).send({
        status: "error",
        message: "Something went wrong",
      })
    }
    else {
      var queryParam = [req.body.username, req.body.mname, req.body.mid];
      connection.query('delete from cartitems where username = ? and medname = ? and mid = ?', queryParam, (err, result, fields) => {
        if (err) {
          console.log(err);
          res.status(200).send({
            status: "error",
            message: "Something went wrong",
          })
        }
        else {
          res.status(200).send({
            status: "success",
            message: "Order Approved"
          })
        }
      })
    }

  })

})

app.post("/decline-orders", (req,res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  else if(session[req.body.secretKey].role !== 3) {
    res.status(200).send({
      status: "error",
      message: "Authorization Failed",
    })
    return;
  }
  else {
    connection.query('update cartitems set is_ordered = 2 where username = ? and is_ordered = 1 and mid = ? and medname = ?', [req.body.username, req.body.mid, req.body.mname], (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(200).send({
          status: "error",
          message: "Something went Wrong"
        })
      }
      else if (result.changedRows == 0) {
        res.status(200).send({
          status: "warning",
          message: "The medicine does not exist..."
        })
      }
      else {
        res.status(200).send({
          status: "success",
          message: "Declined Successfully"
        })
      }
    })
  }
})

app.post("/make-order", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('update cartitems set is_ordered = 1 where username = ? and is_ordered = 0', [session[req.body.secretKey].username], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: "Ordered Successfully"
      })
    }
  })
})

app.post("/get-approved-items", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0', ["NOT_ALLOCATED", session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let temp = [];
      result.forEach(element => {
        temp.push({
          username: element.username,
          mname: element.medname,
          quantity: element.quantity,
          mobileNumber: element.mobile_number,
        })
      })
      res.status(200).send(temp);
    }
  })
})

app.post("/pickup-order", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('update approved_items set delivery_man = ? where username = ? and medname = ? and pharmacy_name = ?', [session[req.body.secretKey].username, req.body.username, req.body.medName, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      res.status(200).send({
        status: "success",
        message: `Picked Up ${req.body.medName}`
      })
    }
  })
})

app.post("/get-orders", (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(200).send({
      status: "error",
      message: "Authentication Failed",
    })
    return;
  }
  connection.query('select a.username, a.medname, a.quantity, u.mobile_number from approved_items a inner join users u on a.username = u.username where a.delivery_man = ? and a.pharmacy_name = ? and a.is_delivered = 0', [session[req.body.secretKey].username, session[req.body.secretKey].pharmacy], (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(200).send({
        status: "error",
        message: "Something went Wrong"
      })
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send([]);
        return;
      }
      let temp = [];
      result.forEach(element => {
        temp.push({
          username: element.username,
          mname: element.medname,
          quantity: element.quantity,
          mobileNumber: element.mobile_number,
        })
      })
      res.status(200).send(temp);
    }
  })
})

app.post("/payment/orders", async (req, res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(500).send("Unauthorized");
    return;
  }
  console.log('username : ',session[req.body.secretKey].username);
  connection.query('select medname, quantity, price from cartitems where username = ? and is_ordered = 0', [session[req.body.secretKey].username], async (err, result, fields) => {
    if (err) {
      console.log(err);
      res.status(500).send("Some error occured")
    }
    else {
      if (!result || (result.length === 0)) {
        res.status(200).send("Cart is Empty");
        return;
      }
      else {
        let totalPay = 0;
        result.forEach(data => totalPay += (+data.quantity) * (+data.price));
        try {
          const instance = new Razorpay({
              key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
              key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
          });
    
          const options = {
              amount: totalPay*100, 
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
  })

});

app.post("/payment/success", (req,res) => {
  console.log("Payment successfull : " + req.body.razorpayPaymentId);
  res.send({
    message : "Payment successful"
  })
})

app.post('/payment/subscription', async (req,res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(500).send("Unauthorized");
    return;
  }
  else {
        let totalPay = req.body.subscriptionType == 'monthly' ? 10 : 100;
        try {
          const instance = new Razorpay({
              key_id: process.env.RAZORPAY_PAYMENT_KEY_ID,
              key_secret: process.env.RAZORPAY_PAYMENT_KEY_SECRET,
          });
    
          const options = {
              amount: totalPay*100, 
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
})

app.post("/activate-subscription", (req,res) => {
  if (!req.body.secretKey || !session[req.body.secretKey] || !session[req.body.secretKey].username) {
    res.status(500).send("Unauthorized");
    return;
  } else {
    connection.query('update users set subscription_pack = ?, date_of_subscription = now() where username = ?', [req.body.subscriptionType,session[req.body.secretKey].username], (err, result, fields) => {
      if (err) {
        console.log(err);
        res.status(500).send("Some error occured")
      }
      else {
        res.send({
          status : "success",
          message : `Subscription Activated : ${req.body.subscriptionType}`,
        })
      }
    })
  }
})

module.exports = app;
