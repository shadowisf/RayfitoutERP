"use client";

import Button from "@/app/components/Button";

export default function Test() {
  async function test() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/resend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "lespaul021504@gmail.com",
            name: "les",
          }),
        }
      );

      const data = await response.json();
      console.log("Response:", data);

      if (response.ok) {
        alert("Email sent successfully!");
      } else {
        alert("Error sending email: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send email");
    }
  }

  return (
    <div>
      <Button
        onClick={test}
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
      >
        TEST
      </Button>
    </div>
  );
}
