const axios = require('axios');

const url = process.env.RENDER_APP_URL;
const interval = process.env.APP_RELOAD_INTERVAL * 1000 || 30000;

function reloadWebsite() {
  if (!url) {
    return;
  }
  axios
    .get(url)
    .then((response) => {
      console.log("website reloaded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

function startReloader() {
    setInterval(reloadWebsite, interval);
}

module.exports = { startReloader };
