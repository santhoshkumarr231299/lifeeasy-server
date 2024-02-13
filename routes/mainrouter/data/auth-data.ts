 var session = new Map();

 var otpRecords = new Map();

 function getSessionData() : any {
    return session;
 }

 function getOtpRecords() : any {
    return otpRecords;
 }


 module.exports = {
    getSessionData,
    getOtpRecords
 }