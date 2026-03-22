export default async function handler(req, res) {
  // Permite CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pega a API key das variáveis de ambiente
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Faz a chamada para a API Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, data);
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### **5. Commit:** "Add API endpoint for Anthropic calls"

## **Passo 2: Configurar a API Key no Vercel**

### **1. Vá para:** https://vercel.com/cesariomf/onda-app

### **2. Clique em "Settings" → "Environment Variables"**

### **3. Adicione:**
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** `sk-ant-...` (sua chave da API Anthropic)
- **Environments:** Production, Preview, Development (marque todos)

### **4. Clique "Save"**

### **5. Vá em "Deployments" → clique nos 3 pontos do último deploy → "Redeploy"**

## **Passo 3: Verificar se o endpoint funciona**

Depois do redeploy (≈2 minutos):

### **1. Teste direto:** 
Abra `https://SEU-APP.vercel.app/api/claude` no browser
- **Deve retornar:** `{"error":"Method not allowed"}` (é normal, só aceita POST)

### **2. Teste o ONDA:**
Abra a URL do Vercel → teste uma jornada completa

---

## **Estrutura correta do repositório:**
```
onda-app/
├── api/
│   └── claude.js          ← NOVO arquivo
├── src/
│   └── Onda.jsx
├── index.html
├── package.json
└── vite.config.js
