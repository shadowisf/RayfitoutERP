import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { db } from "@/lib/db";

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
      Limit: 60,
    });

    const response = await client.send(command);

    // Fetch all departments once and build role → id map
    const [deptRows]: any = await db.query(
      `SELECT id, value FROM lut_mr_headers_departments`,
    );
    const deptMap: Record<string, number> = {};
    for (const row of deptRows as any[]) {
      deptMap[row.value] = row.id;
    }

    const users = response.Users?.map((user) => {
      const role =
        user.Attributes?.find((attr) => attr.Name === "custom:role")?.Value ??
        null;
      return {
        sub: user.Attributes?.find((attr) => attr.Name === "sub")?.Value ?? "",
        email:
          user.Attributes?.find((attr) => attr.Name === "email")?.Value ?? "",
        status: user.UserStatus ?? "",
        name:
          user.Attributes?.find((attr) => attr.Name === "name")?.Value ?? "",
        role,
        departmentID: role ? (deptMap[role] ?? null) : null,
      };
    }) ?? [];

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error });
  }
}
