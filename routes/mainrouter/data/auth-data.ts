 var session = new Map();

 var otpRecords = new Map();

 function getSessionData(){
    return session;
 }

 function getOtpRecords() {
    return otpRecords;
 }


 module.exports = {
    getSessionData,
    getOtpRecords
 }