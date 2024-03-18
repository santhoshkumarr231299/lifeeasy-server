function getUserAuth(req : any, res : any) {
    try {
        let session = req.session;
        let connection = req.db;
        console.log(req.headers.authorization);
        const username = session[req.headers.authorization]?.username;
        connection.query("select username from users where username = ? and status = ?", [username, 1], (err : any, result : any, fields : any) => {
            if(err) {
                res.send({
                    status : "failed",
                    message : "Something went wrong"
                })
                return;
            } else if(result.length == 1) {
                res.send({
                    status : "success",
                    username : username,
                })
                return ;
            }
            res.send({
                status : "failed",
                message : "Unauthorized"
            });
        })
    } catch(e) {
        console.log(e);
        res.send({
            status : "failed",
            message : "Unauthorized"
        });
    }
    
}

module.exports = {
    getUserAuth
}