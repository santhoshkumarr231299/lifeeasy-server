function checkAuth(req : any, res : any, next : any) {
    next();
}

module.exports = {
    checkAuth
}