const { GoogleAuth } = require('google-auth-library');

/**
 * RISC Registration Script
 * Run this script to register your Cloud Run URL as a RISC receiver.
 * 
 * Usage:
 * 1. Ensure you have authorized gcloud: gcloud auth application-default login
 * 2. Set the environment variable: export ENDPOINT_URL="https://your-cloud-run-url"
 * 3. Run: node register.js
 */
async function handleRisc() {
  const mode = process.argv[2] || 'register'; // 'register' or 'verify'
  const endpoint = process.env.ENDPOINT_URL;
  
  if (!endpoint && mode === 'register') {
    console.error('Error: Please set the ENDPOINT_URL environment variable for registration.');
    process.exit(1);
  }

  try {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/risc.configuration.readwrite',
        'https://www.googleapis.com/auth/risc.verify'
      ]
    });
    
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    console.log(`Using Project ID: ${projectId} (Mode: ${mode})`);

    if (mode === 'register') {
      // --- Registration Logic ---
      console.log(`Registering endpoint: ${endpoint}...`);
      const url = 'https://risc.googleapis.com/v1beta/stream:update';
      const body = {
        delivery: {
          delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
          url: endpoint
        },
        events_requested: [
          'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
          'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
          'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
          'https://schemas.openid.net/secevent/risc/event-type/verification'
        ]
      };
      const response = await client.request({ url, method: 'POST', data: body });
      console.log('Successfully registered!', response.status);
    } else if (mode === 'verify') {
      // --- Verification Logic ---
      console.log('Triggering verification event from Google...');
      const url = 'https://risc.googleapis.com/v1beta/stream:verify';
      const body = { state: "Verification test from tutorxyz at " + new Date().toISOString() };
      const response = await client.request({ url, method: 'POST', data: body });
      console.log('Verification request sent!', response.status);
      console.log('Check your Cloud Run logs to see the incoming JWT!');
    }

  } catch (error) {
    console.error(`${mode} failed:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    process.exit(1);
  }
}

handleRisc();
