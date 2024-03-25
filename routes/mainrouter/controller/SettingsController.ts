const Validator = require("../../util/validators.ts");
const FileUpload = require("../data/profile-img-upload-data");

function getUserDetails(req: any, res: any) {
  let connection = req.db;
  let session = req.session;
  connection.query(
    "select u.username as u_username, email, mobile_number, pharmacy_name, branch_id, two_fa_enabled from users u left join user_auth ua on u.username = ua.username where u.username = ? and status = 1",
    [session[req.headers.authorization].username],
    (err: any, result: any, fields: any) => {
      if (result) {
        res.status(200).send({
          username: result[0].u_username,
          email: result[0].email,
          mobileNumber: result[0].mobile_number,
          pharmacyName: result[0].pharmacy_name,
          branchId: result[0].branch_id,
          isTFAEnabled : result[0].two_fa_enabled == 1 ? true : false,
          message: "success",
        });
      } else {
        res.status(200).send({
          username: "",
          message: "success",
        });
      }
    }
  );
}

function updateUserDetails(req: any, res: any) {

  let validationMessage = validateUserDetails(req);
  if(validationMessage != "") {
    res.status(200).send({
      status: "error",
      message: validationMessage,
    });
    return;
  }

  let connection = req.db;
  let session = req.session;
  if (session[req.headers.authorization].username !== req.body.username) {
    res.status(200).send({
      status: "error",
      message: "You cannot change Username",
    });
    return;
  }
  var queryParam = [
    req.body.email,
    req.body.mobileNumber,
    req.body.branchId,
    session[req.headers.authorization].username,
  ];
  connection.query(
    "update users set email = ?, mobile_number = ?, branch_id = ?  where username = ?",
    queryParam,
    (err: any, result: any, fields: any) => {
      if (err) {
        res.status(200).send({
          status: "error",
          message: "Something went wrong",
        });
      } else if (result.changedRows == 0) {
        res.status(200).send({
          status: "warning",
          message: "User Values are the same before",
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

const validateUserDetails = (req : any) : string => {
  let validationMessage = Validator.validateUsername(req.body.username);
  if(validationMessage != "") return validationMessage;
  validationMessage = Validator.validateEmail(req.body.email);
  if(validationMessage != "") return validationMessage;
  validationMessage = Validator.validatePhoneNumber(req.body.mobileNumber);
  if(validationMessage != "") return validationMessage;
  // validate branch ID
  return "";
}

function getProfileImage(req : any, res : any) {
  const session = req.session;
  const username = session[req.headers.authorization].username;
  res.sendFile(username + ".jpg", { root: 'storage/profile-images' });
}

function uploadProfileImage(req : any, res : any) {
  try {
    if(!req.file) {
      res.send({
        status : "error",
        message : "No images were selected"
      })
      return;
    } else if (FileUpload.getFileExtensionNameForProfileImage(req.file.originalname).toLowerCase() != ".jpg") {
      res.send({
        status : "error",
        message : "Image Extension should be jpg"
      })
      return;
    }
    res.send({
      status : "success",
      message : "Profile Image uploaded successfully"
    })
  } catch(e) {
    console.log(e);
    res.send({
      status : "error",
      message : "Something went wrong"
    })
  }
}

function getThemes(req : any, res : any) {
  try {
    const connection = req.db;
    connection.query("select id, name, background, font_color, others from app_themes", (err : any, result : any, fields : any) => {
      if(err) {
        console.log(err);
        res.send({
          status : "error",
          data : []
        });
      }
      let dataList : any = [];
      result.forEach((data : any) => {
        dataList.push({
          id : data.id,
          name : data.name,
          background : data.background,
          fontColor : data.font_color,
          others : data.others
        });
      });
      res.send({
        status : "success",
        data : dataList
      });
    });
  } catch(e) {
    console.log(e);
    res.send({
      status : "error",
      data : []
    });
  }
}

function setTheme(req : any, res : any) {
  try {
    const connection = req.db;
    const username = req.session[req.headers.authorization].username;
    const id : number = req.body.id;
    const query = "INSERT INTO user_props (username, theme_background, theme_font_color, theme_others) SELECT ? AS username, " + 
                  "background AS theme_background, font_color AS theme_font_color, others AS theme_others FROM app_themes at WHERE at.id = ? " + 
                  "ON DUPLICATE KEY UPDATE theme_background = at.background, theme_font_color = at.font_color, theme_others = at.others";
    connection.query(query, [username, id, username], (err : any, result : any, fields : any) => {
      if(err) {
        console.log(err);
        res.send({
          status : "error",
          message : "Something went wrong"
        });
      } else {
        res.send({
          status : "success",
          message : "Theme updated successfully"
        });
      }
    })
  } catch(e) {
    console.log(e);
    res.send({
      status : "error",
      message : "Something went wrong"
    });
  }
}

module.exports = {
  getUserDetails,
  updateUserDetails,
  getProfileImage,
  uploadProfileImage,
  getThemes,
  setTheme
};
