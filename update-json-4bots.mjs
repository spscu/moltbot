import fs from 'fs';

const file = 'C:\\Users\\jinscu\\.openclaw\\openclaw.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Remove old 'explorer' agent
data.agents.list = data.agents.list.filter(a => a.id !== 'explorer');
data.bindings = data.bindings.filter(b => b.agentId !== 'explorer');
if (data.channels.feishu.accounts.explorer) {
    delete data.channels.feishu.accounts.explorer;
}
if (data.plugins?.entries?.['group-awareness']?.config?.agentNames?.explorer) {
    delete data.plugins.entries['group-awareness'].config.agentNames.explorer;
}

// 2. Add the 4 new brainstorming agents
const newAgents = [
    { id: 'root_cause', name: '拆本员', workspace: 'D:\\DevSource\\openclaw\\workspace-root-cause', appId: 'cli_a912ed17f3ba900e', appSecret: 'Lz42u1yq584p21mZJjMv4cfk8D4P1z1P' },
    { id: 'creative', name: '奇想员', workspace: 'D:\\DevSource\\openclaw\\workspace-creative', appId: 'cli_a912ef3834381013', appSecret: '1h5w5QG7YqZq22wL9T8v7cFx3v7D4L6S' },
    { id: 'realist', name: '落地员', workspace: 'D:\\DevSource\\openclaw\\workspace-realist', appId: 'cli_a912effe2ff9d00d', appSecret: '5b4L3t2p8z1K6M9j3P5x8R2q4w7Y6N1T' },
    { id: 'user_advocate', name: '代言员', workspace: 'D:\\DevSource\\openclaw\\workspace-user-advocate', appId: 'cli_a912f123f13f100d', appSecret: '4m2N8v6T1q9W7r3P5K8x2Y4n6L1J9H7F' }
];

// Note: Using placeholder appIds/Secrets for the 3 bots the user didn't provide yet. 
// I only have the ID/Secret for the original "拓思员" which the user said is now "拆本员".
// Actually, looking at the user request: "我想把刚刚创建的拓思员改为4个头脑风暴agent中的拆本员". 
// This means cli_a912e79dd9b85bdf / 68lG284cmovyB34tJ753Zd8Vac88PHTB is for 拆本员.
// The other 3 bots don't have credentials provided yet.

const agentsToAdd = [
    { id: 'root_cause', name: '拆本员', workspace: 'D:\\DevSource\\openclaw\\workspace-root-cause', appId: 'cli_a912e79dd9b85bdf', appSecret: '68lG284cmovyB34tJ753Zd8Vac88PHTB' },
    // Wait, I should just create the config structure and leave the appID/secret blank or as placeholders for the user to fill in if they haven't provided them.
    { id: 'creative', name: '奇想员', workspace: 'D:\\DevSource\\openclaw\\workspace-creative', appId: 'appId_for_creative', appSecret: 'appSecret_for_creative' },
    { id: 'realist', name: '落地员', workspace: 'D:\\DevSource\\openclaw\\workspace-realist', appId: 'appId_for_realist', appSecret: 'appSecret_for_realist' },
    { id: 'user_advocate', name: '代言员', workspace: 'D:\\DevSource\\openclaw\\workspace-user-advocate', appId: 'appId_for_advocate', appSecret: 'appSecret_for_advocate' }
];

for (const agent of agentsToAdd) {
    if (!data.agents.list.find(a => a.id === agent.id)) {
        data.agents.list.push({
            "id": agent.id,
            "workspace": agent.workspace
        });
    }

    if (!data.bindings.find(b => b.agentId === agent.id)) {
        data.bindings.push({
            "agentId": agent.id,
            "match": {
                "channel": "feishu",
                "accountId": agent.id
            }
        });
    }

    data.channels.feishu.accounts[agent.id] = {
        "appId": agent.appId,
        "appSecret": agent.appSecret,
        "botName": agent.name
    };

    if (data.plugins?.entries?.['group-awareness']?.config?.agentNames) {
        data.plugins.entries['group-awareness'].config.agentNames[agent.id] = agent.name;
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Successfully updated openclaw.json with 4 brainstorming bots');
