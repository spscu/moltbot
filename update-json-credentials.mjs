import fs from 'fs';

const file = 'C:\\Users\\jinscu\\.openclaw\\openclaw.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Update credentials for the 3 missing bots
if (data.channels.feishu.accounts.creative) {
    data.channels.feishu.accounts.creative.appId = 'cli_a912dd4f84b89bdf';
    data.channels.feishu.accounts.creative.appSecret = 'kxtxeYuE089tjtFsF0lSIgE12ptlOsxx';
}

if (data.channels.feishu.accounts.realist) {
    data.channels.feishu.accounts.realist.appId = 'cli_a912ddfb54f89bd7';
    data.channels.feishu.accounts.realist.appSecret = 'oRRtbgCxxaU94mJX4X1sFDQmrLFyW3CN';
}

if (data.channels.feishu.accounts.user_advocate) {
    data.channels.feishu.accounts.user_advocate.appId = 'cli_a912de7177f8dbef';
    data.channels.feishu.accounts.user_advocate.appSecret = 'Q1Nf0VM4Ka0KY6ziP4edphFOZkM8ifGJ';
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Successfully updated App IDs and Secrets for the 3 new bots in openclaw.json');
