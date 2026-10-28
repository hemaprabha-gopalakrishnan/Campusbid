import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthFrame mode="sign-in">
      <SignInForm />
    </AuthFrame>
  );
}