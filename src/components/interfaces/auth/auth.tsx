import { useState } from "react";
import { pb } from "@/services/pocketbase";
import { formHandler } from "@/utils/form";
import { ClientResponseError } from "pocketbase";
import { Link, useRouter } from "@tanstack/react-router";
import { useFormState } from "@/components/hooks/use-form-state";

const SocialAuth = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>();

  const login = async () => {
    setIsLoading(true);

    const openWindow = window.open();

    await pb
      .collection("users")
      .authWithOAuth2({
        provider: "google",
        urlCallback: (url) => {
          if (openWindow) openWindow.location.href = url;
        },
      })
      .then(() => router.navigate({ to: "/dashboard" }))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={login}
        disabled={isLoading}
        className="space-x-2"
      >
        {isLoading && "...loading"}
        {!isLoading && "Continue with Google"}
      </button>
    </div>
  );
};

/**
 * login form
 *
 * @returns
 */
export const LoginForm = () => {
  const router = useRouter();

  const form = useFormState<{ identity: string; password: string }>({
    defaultValue: { identity: "", password: "" },
    validations: {
      identity: (value: string) =>
        !value.trim() ? "Username or email cannot be blank" : undefined,
      password: (value: string) =>
        !value.trim() ? "Password cannot be blank" : undefined,
    },
  });

  const loginWithPassword = () =>
    form.submit(async (data: { identity: string; password: string }) => {
      pb.collection("users")
        .authWithPassword(data.identity, data.password)
        .then(() => router.navigate({ to: "/dashboard" }))
        .catch(async (err: Error) => {
          if (err instanceof ClientResponseError)
            if (err.status === 403)
              /**
               * if current user is unverified it will
               * return3 403, so we send verification link
               * to their identity.
               *
               * if the identity is not email (username), just
               * catch the error and don't do anything about it
               */
              await pb
                .collection("users")
                .requestVerification(data.identity)
                .then(() => {
                  return router.navigate({
                    to: "/auth/email-verification",
                    search: { email: data.identity },
                  });
                })
                .catch(() => ({}));

          return form.setError("identity", (err as Error).message);
        });
    });

  return (
    <form
      onSubmit={formHandler(loginWithPassword)}
      className="m-auto flex flex-col gap-3 p-2"
    >
      <label htmlFor="identity">
        Username or Email
      </label>
      <input
        name="identity"
        value={form.data.identity}
        disabled={form.isSubmitting}
        placeholder="email@example.com"
        onChange={(e) => form.setValue("identity", e.target.value)}
      />
      {form.errors?.identity}

      <label htmlFor="password">
        Password
      </label>
      <input
        name="password"
        type="password"
        value={form.data.password}
        disabled={form.isSubmitting}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("password", e.target.value)}
      />
      {form.errors?.password}

      <Link to="/auth/password-reset">Forgot Password?</Link>

      <button type="submit" className="space-x-2" disabled={form.isSubmitting}>
        {form.isSubmitting && "...loading"}
        <span>Login</span>
      </button>

      <div className="text-center text-sm">
        <span>No Account Yet? </span>
        <Link to="/auth/register" className="font-bold">
          Register
        </Link>
      </div>

      <SocialAuth />
    </form>
  );
};

/**
 * register form
 *
 * @returns
 */
export const RegisterForm = () => {
  const router = useRouter();

  const form = useFormState({
    defaultValue: {
      name: "",
      email: "",
      username: "",
      password: "",
      passwordConfirm: "",
    },
    validations: {
      name: (value) =>
        !value.trim() ? "Your Name cannot be blank" : undefined,
      email: (value) =>
        !value.trim()
          ? "Email cannot be blank"
          : !/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(value)
            ? "Email not valid"
            : undefined,
      username: (value) =>
        !value.trim()
          ? "Username cannot be blank"
          : !/^[a-zA-Z0-9_-]{3,15}$/.test(value)
            ? "Username only alphanumeric 3-15 characters"
            : undefined,
      password: (value) =>
        !value.trim()
          ? "Password cannot be blank"
          : !/^[A-Za-z\d]{8,}$/.test(value)
            ? "Password minimum 8 chracters"
            : undefined,
      passwordConfirm: (value, data) =>
        !value.trim()
          ? "Password confirmation cannot be blank"
          : data.password !== value
            ? "password confirmation does not match"
            : undefined,
    },
  });

  const register = () =>
    form.submit(async (data) => {
      console.log("register", JSON.stringify(data, null, 2));
      pb.collection("users")
        .create(data)
        .then(() => {
          pb.collection("users")
            .requestVerification(data.email)
            .then(() => {
              return router.navigate({
                to: "/auth/email-verification",
                search: { email: data.email },
              });
            });
        })
        .catch((err) => {
          if (!(err instanceof ClientResponseError))
            return form.setError("name", (err as Error).message);

          if (!err.data.data) return form.setError("name", err.message);

          for (const key in err.data.data)
            form.setError(
              key as keyof typeof form.data,
              err.data.data[key].message,
            );
        });
    });

  return (
    <form
      onSubmit={formHandler(register)}
      className="m-auto flex flex-col gap-3 p-2"
    >
      <label htmlFor="name">
        Name
      </label>
      <input
        name="name"
        value={form.data.name}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("name", e.target.value)}
      />
      {form.errors?.name}

      <label htmlFor="email">
        Email
      </label>
      <input
        name="email"
        type="email"
        value={form.data.email}
        disabled={form.isSubmitting}
        placeholder="email@example.com"
        onChange={(e) => form.setValue("email", e.target.value)}
      />
      {form.errors?.email}

      <label htmlFor="username">
        Username
      </label>
      <input
        name="username"
        value={form.data.username}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("username", e.target.value)}
      />
      {form.errors?.username}

      <label htmlFor="password">
        Password
      </label>
      <input
        name="password"
        type="password"
        value={form.data.password}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("password", e.target.value)}
      />
      {form.errors?.password}

      <label htmlFor="passwordConfirm">
        Password Confirmation
      </label>
      <input
        type="password"
        name="passwordConfirm"
        value={form.data.passwordConfirm}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("passwordConfirm", e.target.value)}
      />
      {form.errors?.passwordConfirm}

      <button type="submit" className="space-x-2" disabled={form.isSubmitting}>
        {form.isSubmitting && "...loading"}
        Register
      </button>

      <Link to="/auth/login">Back to login</Link>
    </form>
  );
};

/**
 * create organization form
 *
 * @returns
 */
export const CreateOrganizationForm = () => {

  const router = useRouter();

  const form = useFormState({
    defaultValue: { name: "", slug: "" },
    validations: {
      name: (value) => !value.trim() ? "Organization Name cannot be blank" : undefined,
      slug: (value) => !value.trim() ? "Organization Slug cannot be blank" : undefined,
    },
  });
  // pages/CreateFirstOrg.js
  const handleCreateOrg = () => {
    console.log("handleCreateOrg", form.data);
    form.submit(async (data: { name: string; slug: string }) => {
      // 1. Create the organization
      // The API Rule: "Create: @request.auth.id != ''" allows any logged-in user
      const org = await pb.collection('organisations').create({
        name: data.name,
        slug: data.slug,
      });

      await pb.collection("users").update(pb.authStore.model?.id, {
        orgs: [...pb.authStore.model?.orgs, org.id],
        current_org: org.id,
      });

      // 2. IMPORTANT: Refresh the Auth Store
      // Our server hook (pb_hooks) has already updated the user's 'orgs' list.
      // We must refresh the local token to "see" that update in React.
      await pb.collection('users').authRefresh();

      // 3. Success! Move to dashboard
      router.navigate({ to: "/dashboard" });
    });
  };
  return (
    <form onSubmit={formHandler(handleCreateOrg)}>
      <label htmlFor="name"> Organization Name </label>
      <input
        type="text"
        name="name"
        placeholder="Organization Name"
        value={form.data.name}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("name", e.target.value)}
      />
      {form.errors?.name}
      <label htmlFor="slug"> Organization Slug </label>
      <input type="text"
        name="slug"
        placeholder="organization-slug"
        value={form.data.slug}
        disabled={form.isSubmitting}
        onChange={(e) => form.setValue("slug", e.target.value)}
      />
      {form.errors?.slug}
      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting && "...loading"}
        <span>Create Organization</span>
      </button>
    </form>
  );
};