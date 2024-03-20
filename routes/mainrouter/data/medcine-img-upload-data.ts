const multer = require("multer");
const path = require('path');
const AuthData = require("../data/auth-data.ts");
const StartupController = require("../controller/StartupController.ts");

const getFileExtensionName = (filename : string) => {
    return path.extname(filename);
}

const getAllowedMedicineImageFileExts = () => {
    return [
        ".jpg"
    ]
}

const medicineStorage = multer.diskStorage({
    destination : (req : any, file : any, cb : any) => {
        cb(null, __dirname + "/../../../storage/medicine-images");
    },
    filename : async (req : any, file : any, cb : any) => {
        let session = AuthData.getSessionData();
        if(session[req.headers.authorization] && session[req.headers.authorization].username) {
            const mid : number = req.query.mid; // send mid in the req
            const fileExtension : string = getFileExtensionName(file.originalname);
            cb(null, mid + fileExtension);
        }
    }
});

const medicineFileLimits = {
    fileSize : 1024 * 1024 * 5 // 5 MB max
}

const medicineFileFilter = async (req : any, file : any, cb : any) => {
    const mid : number= req.query.mid;
    const session = req.session;
    const fileExtension : string = getFileExtensionName(file.originalname);
    if(!(fileExtension && getAllowedMedicineImageFileExts().includes(fileExtension.toLowerCase()))) {
        cb(new Error("File Extension is not allowed"), false);
    } else if(!(await isAuthorizedToUpload(mid, session[req.headers.authorization].pharmacy))) {
        cb(new Error("Unauthorized to Upload the Image"), false);
    }
    cb(null, true);
}

function isAuthorizedToUpload(mid : number, pharmacyName : string) {
    return new Promise((resolve : any, reject : any) => {
        const connection = StartupController.getConnection();
        connection.query("select count(m.mid) as total from medicines m left join users u on m.username = u.username where m.mid = ? and u.pharmacy_name = ?", 
        [mid, pharmacyName]
        , (err : any, result : any, fields : any) => {
            if(err) {
                resolve(false);
            } else if(result[0].total == 1) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

const medicineUpload = multer({ storage: medicineStorage, limits : medicineFileLimits,  fileFilter : medicineFileFilter});

module.exports = {
    medicineUpload,
    getFileExtensionName
}