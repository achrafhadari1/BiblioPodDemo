"use client";

import { SignIn } from "@/components/pages/SignIn";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function LoginPage() {
  usePageTitle("Sign In");

  return <SignIn />;
}
