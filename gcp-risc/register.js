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
async function registerRisc() {
  const endpoint = process.env.ENDPOINT_URL;
  
  if (!endpoint) {
    console.error('Error: Please set the ENDPOINT_URL environment variable.');
    console.log('Example: export ENDPOINT_URL="https://risc-receiver-xxx.run.app"');
    process.exit(1);
  }

  console.log(`Authenticating and registering endpoint: ${endpoint}...`);

  try {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/risc.configuration.readwrite'
      ]
    });
    
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log(`Using Project ID: ${projectId}`);

    const url = 'https://risc.googleapis.com/v1beta/stream:update';
    
    const body = {
      delivery: {
        delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
        endpoint: endpoint
      }
    };

    const response = await client.request({
      url,
      method: 'POST',
      data: body
    });

    console.log('Successfully registered!');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    console.log('\nNext Step: Go to Google Cloud Console to send a test event to verify.');

  } catch (error) {
    console.error('Registration failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

registerRisc();
