import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function ConfirmationNotice({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;

  if (error !== "confirmation") {
    return null;
  }

  return (
    <p aria-live="polite" className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      That confirmation link is invalid or expired. Request a new one by creating your account again.
    </p>
  );
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <AuthFrame mode="sign-in">
      <Suspense fallback={null}>
        <ConfirmationNotice searchParams={searchParams} />
      </Suspense>
      <SignInForm />
    </AuthFrame>
  );
}