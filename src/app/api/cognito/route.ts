import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export async function GET() {
  try {
    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ListUsersCommand({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      Limit: 60, // number of users per request (max 60)
    });

    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      users: response.Users?.map((user) => ({
        username: user.Username,
        email: user.Attributes?.find((attr) => attr.Name === "email")?.Value,
        status: user.UserStatus,
        name: user.Attributes?.find((attr) => attr.Name === "name")?.Value,
        role: user.Attributes?.find((attr) => attr.Name === "custom:role")
          ?.Value,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error });
  }
}
