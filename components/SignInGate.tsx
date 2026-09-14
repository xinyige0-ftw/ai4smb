"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import SignInModal from "./SignInModal";

export default function SignInGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // getSession() reads the session out of the cookie; getUser() is a network
    // call to /auth/v1/user, and that endpoint shares one IP-scoped bucket
    // (30 requests / 5 minutes) with /auth/v1/otp. Spending it on a UI read
    // means a person who has clicked around the site for a few minutes gets a
    // 429 the moment they ask for a sign-in link. Nothing here is a security
    // decision -- it fills in a name and an avatar -- so the cookie is enough.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) setShow(true);
    });
  }, []);

  if (!show) return null;
  return <SignInModal onClose={() => setShow(false)} />;
}
