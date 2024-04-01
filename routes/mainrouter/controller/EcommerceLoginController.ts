import axios from "axios";

function getDrugInfo(req : any, res : any) {
    const options = {
        method: 'GET',
        url: process.env.RAPID_API_URL,
        params: {drug: req.query.searchWord},
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_API_KEY,
          'X-RapidAPI-Host': process.env.RAPID_HOST
        }
      };
    axios.request(options).then((response : any) => {
        res.send(response.data);
    }).catch((error) => {
        res.send([]);
    });
}

module.exports = {
    getDrugInfo
}