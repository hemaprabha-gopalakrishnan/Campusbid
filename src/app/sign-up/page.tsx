import { AuthFrame } from "@/components/auth/auth-frame";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthFrame mode="sign-up">
      <SignUpForm />
    </AuthFrame>
  );
}