const fetch = require('node-fetch');

// Configuração manual para o teste (pegue do .env se necessário)
const API_URL = 'https://evolution.redebrazil.com.br'; // Ajuste se necessário baseado no screenshot
const GLOBAL_TOKEN = 'B67D99002E71424E-9104F34A59695662'; // Substitua pelo token real do .env para testar

async function debugInstance(instanceName, token) {
    const baseUrl = API_URL.replace(/\/$/, '');
    const headers = {
        'Content-Type': 'application/json',
        'apikey': token || GLOBAL_TOKEN,
    };

    console.log(`--- DEBUGGING INSTANCE: ${instanceName} ---`);

    try {
        console.log(`\n1. Testing /instance/connectionState/${instanceName}...`);
        const res1 = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
        const data1 = await res1.json();
        console.log('Response:', JSON.stringify(data1, null, 2));
    } catch (err) {
        console.error('Error in connectionState:', err.message);
    }

    try {
        console.log(`\n2. Testing /instance/fetchInstances?instanceName=${instanceName}...`);
        const res2 = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, { headers });
        const data2 = await res2.json();
        console.log('Response:', JSON.stringify(data2, null, 2));
    } catch (err) {
        console.error('Error in fetchInstances:', err.message);
    }
}

// Se o usuário passar argumentos no terminal: node scripts/debug_sync.js nome_da_instancia token
const args = process.argv.slice(2);
if (args.length > 0) {
    debugInstance(args[0], args[1]);
} else {
    console.log('Uso: node scripts/debug_sync.js <nome_da_instancia> [token_opcional]');
}
