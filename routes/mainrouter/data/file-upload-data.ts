const multer = require("multer");

const medicineStorage = multer.diskStorage({
    destination : (req : any, file : any, cb : any) => {
        cb(null, __dirname + "/../../../storage/medicine-images");
    },
    filename : (req : any, file : any, cb : any) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const medicineUpload = multer({ storage: medicineStorage });

module.exports = {
    medicineUpload
}