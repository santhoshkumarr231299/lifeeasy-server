const multer = require("multer");
const path = require('path');
const AuthData = require("../data/auth-data.ts");

const getFileExtensionName = (filename : string) => {
    return path.extname(filename);
}

const medicineStorage = multer.diskStorage({
    destination : (req : any, file : any, cb : any) => {
        cb(null, __dirname + "/../../../storage/medicine-images");
    },
    filename : async (req : any, file : any, cb : any) => {
        let session = AuthData.getSessionData();
        if(session[req.headers.authorization] && session[req.headers.authorization].username) {
            const username : string = session[req.headers.authorization].username;
            const fileExtension : string = getFileExtensionName(file.originalname);
            const mid : number = req.query.mid; // send mid in the req
            if(fileExtension && fileExtension.toLowerCase() == ".jpg") {
                cb(null, mid + fileExtension);
            }
        }
    }
});

const medicineUpload = multer({ storage: medicineStorage });

module.exports = {
    medicineUpload,
    getFileExtensionName
}