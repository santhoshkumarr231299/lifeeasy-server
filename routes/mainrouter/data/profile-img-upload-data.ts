const multer = require("multer");
const path = require('path');
const AuthData = require("../data/auth-data.ts");
const StartupController = require("../controller/StartupController.ts");

const getFileExtensionNameForProfileImage = (filename : string) => {
    return path.extname(filename);
}

const getAllowedProfileImageFileExts = () => {
    return [
        ".jpg"
    ]
}

const profileImageStorage = multer.diskStorage({
    destination : (req : any, file : any, cb : any) => {
        cb(null, __dirname + "/../../../storage/profile-images");
    },
    filename : async (req : any, file : any, cb : any) => {
        let session = AuthData.getSessionData();
        if(session[req.headers.authorization] && session[req.headers.authorization].username) {
            const username : string = session[req.headers.authorization].username;
            const fileExtension : string = getFileExtensionNameForProfileImage(file.originalname);
            cb(null, username + fileExtension);
        } else {
            cb(new Error("Unauthorized"), null);
        }
    }
});

const profileImageFileLimits = {
    fileSize : 1024 * 1024 * 5 // 5 MB max
}

const profileImageFileFilter = async (req : any, file : any, cb : any) => {
    const mid : number= req.query.mid;
    const session = req.session;
    const fileExtension : string = getFileExtensionNameForProfileImage(file.originalname);
    if(!(fileExtension && getAllowedProfileImageFileExts().includes(fileExtension.toLowerCase()))) {
        cb(new Error("File Extension is not allowed"), false);
    }
    cb(null, true);
}

const profileImageUpload = multer({ storage: profileImageStorage, limits : profileImageFileLimits,  fileFilter : profileImageFileFilter});

module.exports = {
    profileImageUpload,
    getFileExtensionNameForProfileImage
}