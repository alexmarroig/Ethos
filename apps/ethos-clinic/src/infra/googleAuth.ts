import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '83150950956-5avv08g9dsds5fpm7dfd9ui6rptn8uu2.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      google_id: payload.sub,
    };
  } catch (error) {
    console.error('[googleAuth] Error verifying token:', error);
    return null;
  }
}
