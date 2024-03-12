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

module.exports = {
  deleteUserSession,
  deleteProvidedSession,
  deleteOtpRecord,
};
