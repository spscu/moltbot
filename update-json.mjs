import fs from 'fs';

const file = 'C:\\Users\\jinscu\\.openclaw\\openclaw.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!data.agents.list.find(a => a.id === 'explorer')) {
    data.agents.list.push({
        "id": "explorer",
        "workspace": "D:\\DevSource\\openclaw\\workspace-explorer"
    });
}

if (!data.bindings.find(b => b.agentId === 'explorer')) {
    data.bindings.push({
        "agentId": "explorer",
        "match": {
            "channel": "feishu",
            "accountId": "explorer"
        }
    });
}

data.channels.feishu.accounts.explorer = {
    "appId": "cli_a912e79dd9b85bdf",
    "appSecret": "68lG284cmovyB34tJ753Zd8Vac88PHTB",
    "botName": "拓思员"
};

if (data.plugins && data.plugins.entries && data.plugins.entries['group-awareness'] && data.plugins.entries['group-awareness'].config && data.plugins.entries['group-awareness'].config.agentNames) {
    data.plugins.entries['group-awareness'].config.agentNames.explorer = "拓思员";
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Successfully updated openclaw.json');
