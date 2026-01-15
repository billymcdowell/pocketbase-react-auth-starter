import { type FC, useState } from "react";
import { pb } from "@/services/pocketbase";
import { formHandler } from "@/utils/form";
import { Link } from "@tanstack/react-router";
import { useFormState } from "@/components/hooks/use-form-state";


export const PasswordResetRequest = () => {
  const [requestSend, setRequestSend] = useState(false);

  const form = useFormState({
    defaultValue: { email: "" },
    validations: {
      email: (value) =>
        !value.trim()
          ? "Email cannot be blank"
          : !/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(value)
            ? "Email not valid"
            : undefined,
    },
  });

  const requestResetPassword = () =>
    form.submit(async (data) => {
      pb.collection("users")
        .requestPasswordReset(data.email)
        .then(() => setRequestSend(true))
        .catch((err) => form.setError("email", (err as Error).message));
    });

  return (
    <div className="flex flex-col gap-y-2 p-2">
      {!requestSend && (
        <form
          onSubmit={formHandler(requestResetPassword)}
          className="m-auto flex flex-col gap-3"
        >
          <p className="text-sm">
            Enter the email associated with your account, and we'll send you the
            verification code to reset your password.
          </p>
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

          <button
            type="submit"
            className="space-x-2"
            disabled={form.isSubmitting}
          >
            {form.isSubmitting && (
              "...loading"
            )}
            <span>Reset Password</span>
          </button>
        </form>
      )}

      {requestSend && (
        <p className="text-sm">
          The password reset link has been sent to your email {form.data.email}
        </p>
      )}
        <Link to="/auth/login">Back to Login</Link>
    </div>
  );
};

export const PasswordResetAttempt: FC<{ token?: string }> = ({ token }) => {
  const [passwordReseted, setPasswordReseted] = useState(false);

  const form = useFormState({
    defaultValue: {
      password: "",
      passwordConfirm: "",
    },
    validations: {
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

  const changePassword = () =>
    form.submit(async (data) => {
      if (token)
        pb.collection("users")
          .confirmPasswordReset(token, data.password, data.passwordConfirm)
          .then(() => setPasswordReseted(true))
          .catch((err) => form.setError("password", (err as Error).message));
    });

  return (
    <div className="flex flex-col gap-3 space-y-2 p-2">
      {token && !passwordReseted && (
        <form
          onSubmit={formHandler(changePassword)}
          className="m-auto flex w-full flex-col gap-3"
        >
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

          <button
            type="submit"
            className="space-x-2"
            disabled={form.isSubmitting}
          >
            {form.isSubmitting && (
              "...loading"
            )}
            <span>Reset Password</span>
          </button>
        </form>
      )}

      {token && passwordReseted && (
        <div className="flex flex-col items-center gap-4">
          Successfully resetted password
          <p className="text-center text-sm">
            Your password has been successfully reseted!. You can now login with
            your new password to your account.
          </p>
        </div>
      )}

      {!token && (
        <div className="flex flex-col items-center gap-4">
          Invalid or expired password reset link
          <p className="text-center text-sm">
            The password reset link is invalid or has expired. Please request a
            new password reset link.
          </p>
          <Link to="/auth/password-reset">Request new password</Link>
        </div>
      )}

      <Link to="/auth/login">Back to login</Link>
    </div>
  );
};
