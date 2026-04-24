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
// RETRY HELPER
// Retries on transient Cognito 500 / network errors only.
// Genuine auth failures (wrong password, user not found, etc.) are NOT retried.
// --------------------------------------------------
const NON_RETRYABLE_CODES = new Set([
  "NotAuthorizedException",
  "UserNotFoundException",
  "UserNotConfirmedException",
  "PasswordResetRequiredException",
  "InvalidParameterException",
  "InvalidPasswordException",
  "CodeMismatchException",
  "ExpiredCodeException",
  "LimitExceededException",
  "TooManyRequestsException",
]);

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const code: string = err?.code ?? err?.name ?? "";
      const isNonRetryable = NON_RETRYABLE_CODES.has(code);
      if (isNonRetryable || attempt === maxRetries - 1) throw err;
      // Exponential backoff: 600 ms → 1200 ms → 2400 ms
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastError;
}

// --------------------------------------------------
// LOGIN FUNCTION
// --------------------------------------------------
export function login(username: string, password: string) {
  // Each retry needs a fresh CognitoUser instance (the object is stateful)
  const attempt = () => {
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const user = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise<any>((resolve, reject) => {
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

          resolve({
            status: "NEW_PASSWORD_REQUIRED",
            user,
            userAttributes,
            requiredAttributes,
          });
        },
      });
    });
  };

  return withRetry(attempt);
}

// --------------------------------------------------
// COMPLETE NEW PASSWORD CHALLENGE
// --------------------------------------------------
export function completeNewPassword(
  user: CognitoUser,
  newPassword: string,
  attributes: Record<string, string> = {},
) {
  return new Promise((resolve, reject) => {
    // List of attributes that should NOT be modified
    const readOnlyAttributes = [
      "email_verified",
      "phone_number_verified",
      "email",
      "phone_number",
      "sub",
    ];

    const filteredAttributes: Record<string, string> = {};

    Object.keys(attributes).forEach((key) => {
      if (!readOnlyAttributes.includes(key)) {
        filteredAttributes[key] = attributes[key];
      }
    });

    user.completeNewPasswordChallenge(newPassword, filteredAttributes, {
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
  if (!user) return Promise.resolve(null);

  const attempt = () =>
    new Promise<any>((resolve, reject) => {
      user.getSession((err: any, session: any) => {
        if (err) {
          // Treat session expiry as null (user just needs to log in again)
          // only surface real errors for retry
          const code: string = err?.code ?? err?.name ?? "";
          const isSessionExpiry =
            code === "NotAuthorizedException" ||
            code === "UserNotFoundException";
          if (isSessionExpiry) {
            resolve(null);
          } else {
            reject(err);
          }
          return;
        }
        if (!session || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      });
    });

  // Retry transient Cognito 500s; fall back to null if all retries fail
  return withRetry(attempt).catch(() => null);
}
