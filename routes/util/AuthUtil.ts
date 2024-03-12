function deleteUserSession(username: string, session: any) {
  if (session) {
    for (const keyValue of Object.entries(session)) {
      if (session[keyValue[0]].username == username) {
        try {
          delete session[keyValue[0]];
        } catch (e) {}
      }
    }
    console.log("Session deleted for the User : ", username);
  }
}

function deleteProvidedSession(sessionKey : string, session : any) {
  try {
    delete session[sessionKey];
  } catch(e) {}
}

function deleteOtpRecord(otpSecretKey : string, otpRecordsMap : any) {
  try {
    delete otpRecordsMap[otpSecretKey];
  } catch(e) {}
}

function isAllowedToSentOtpForTFA(currentDateTime : Date, lastOtpSent : Date) {
  try {
    const currentMin : number = currentDateTime.getMinutes();
    const currentHour : number = currentDateTime.getHours();
    const lastOtpSentMin : number = lastOtpSent.getMinutes();
    const lastOtpSentHour : number = lastOtpSent.getHours();
    const expiryLimit : number = Number(process.env.MAIL_OTP_EXPIRY_MINUTE);
    if(currentDateTime.getDate() != lastOtpSent.getDate()) {
      return true;
    } else if(currentHour == lastOtpSentHour && (currentMin - lastOtpSentMin) > expiryLimit) {
      return true;
    } else if(currentHour > lastOtpSentHour && (60 - lastOtpSentMin + currentMin) > expiryLimit) {
      return true;
    }
    return false;
  } catch(e) {
    console.log(e);
    return false;
  }
}

module.exports = {
  deleteUserSession,
  deleteProvidedSession,
  deleteOtpRecord,
  isAllowedToSentOtpForTFA
};
