const path = require('path');

const options = {
    "path": path.join(__dirname)
};
const nconfig = require('nconfig')(options);

let mode = process.env.MODE;
const config = nconfig.loadSync(mode);

console.log(config);

module.exports = config;