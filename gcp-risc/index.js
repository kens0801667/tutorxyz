const functions = require('@google-cloud/functions-framework');
const jose = require('jose');

// Replace with your actual Client ID if different
const GOOGLE_CLIENT_ID = '460394973365-mcns5e5ru5tornbmofh2cb0ld12a5nco.apps.googleusercontent.com';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/**
 * Google RISC (Risk Incident Shared Check) Receiver
 * This function receives security events from Google and verifies them.
 */
functions.http('riscReceiver', async (req, res) => {
  // Google RISC sends the JWT in the raw body. 
  // Using rawBody is the most robust way in GCP/Functions-framework environments.
  let token = req.rawBody ? req.rawBody.toString() : req.body;

  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.warn('Received invalid, empty, or non-string token');
    console.log('Body Type:', typeof req.body);
    console.log('RawBody Present:', !!req.rawBody);
    return res.status(400).send('Invalid token structure');
  }

  try {
    // 2. Fetch Google's public keys and verify the JWT
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: GOOGLE_CLIENT_ID,
    });

    // 3. Log the verified event for audit purposes
    console.log('Verified RISC Event:', JSON.stringify(payload, null, 2));

    // 4. Handle specific event types if needed
    // Example event types: 
    // - https://schemas.openid.net/secevent/risc/event-type/tokens-revoked
    // - https://schemas.openid.net/secevent/risc/event-type/account-disabled
    const events = payload.events || {};
    for (const eventType in events) {
      console.info(`Handling event type: ${eventType}`);

      // In a serverless/client-only architecture, we mostly use this for administrative logging.
      // The client App will naturally handle session expiration/revocation via 401 errors.
    }

    // 5. Google requires a 202 Accepted response for successful reception
    return res.status(202).send('Accepted');

  } catch (error) {
    console.error('JWT Verification Failed:', error.message);
    // Even if verification fails, Google may retry if we don't return a 2xx, 
    // but for debugging it's better to return 401.
    return res.status(401).send(`Unauthorized: ${error.message}`);
  }
});
