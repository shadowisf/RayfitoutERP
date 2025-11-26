import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

// --- USER POOL CONFIG ---
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
};

const userPool = new CognitoUserPool(poolData);

// --------------------------------------------------
// LOGIN FUNCTION
// --------------------------------------------------
export function login(username: string, password: string) {
  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  const user = new CognitoUser({
    Username: username,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          status: "SUCCESS",
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          user,
        });
      },

      onFailure: (err) => {
        reject(err);
      },

      // Handle new password required
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // Clean up attributes that Cognito doesn't allow to be modified
        delete userAttributes.email_verified;
        delete userAttributes.phone_number_verified;
        
        console.log("User Attributes:", userAttributes);
        console.log("Required Attributes:", requiredAttributes);
        
        resolve({
          status: "NEW_PASSWORD_REQUIRED",
          user,
          userAttributes,
          requiredAttributes,
        });
      },
    });
  });
}

// --------------------------------------------------
// COMPLETE NEW PASSWORD CHALLENGE
// --------------------------------------------------
// --------------------------------------------------
// COMPLETE NEW PASSWORD CHALLENGE
// --------------------------------------------------
export function completeNewPassword(
  user: CognitoUser,
  newPassword: string,
  attributes: Record<string, string> = {}
) {
  return new Promise((resolve, reject) => {
    // List of attributes that should NOT be modified
    const readOnlyAttributes = [
      'email_verified',
      'phone_number_verified',
      'email', // Add email to read-only list
      'phone_number', // Add phone_number to read-only list
      'sub', // User ID should never be modified
    ];

    // Filter out read-only attributes and add prefix to remaining ones
    const attributesWithPrefix: Record<string, string> = {};
    
    Object.keys(attributes).forEach((key) => {
      if (!readOnlyAttributes.includes(key)) {
        attributesWithPrefix[key] = attributes[key];
      }
    });

    console.log("Sending attributes:", attributesWithPrefix);

    user.completeNewPasswordChallenge(newPassword, attributesWithPrefix, {
      onSuccess: (session) => {
        resolve({
          status: "SUCCESS",
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => {
        console.error("Complete new password error:", err);
        reject(err);
      },
    });
  });
}

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------
export function logout() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

// --------------------------------------------------
// GET CURRENT USER SESSION
// --------------------------------------------------
export function getSession(): Promise<any> {
  const user = userPool.getCurrentUser();

  return new Promise((resolve, reject) => {
    if (!user) return resolve(null);

    user.getSession((err: any, session: any) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
      } else {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      }
    });
  });
}