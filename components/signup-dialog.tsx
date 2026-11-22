"use client";

import { useId, useRef } from "react";
import { X } from "lucide-react";
import { GoogleMark } from "./google-mark";

export function SignupDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const availabilityId = useId();

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" className="googleSignupNavTab" aria-haspopup="dialog" ref={trigger} onClick={() => {
        dialog.current?.showModal();
        closeButton.current?.focus();
      }}>Sign Up</button>
      <dialog
        className="authDialog"
        ref={dialog}
        aria-labelledby={headingId}
        aria-describedby={availabilityId}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="authDialogPanel">
          <button type="button" className="authDialogClose" aria-label="Close signup" ref={closeButton} onClick={close}><X size={18} /></button>
          <h2 id={headingId}>Join PartnerLinks</h2>
          <div className="authDialogActions">
            <button type="button" className="authDialogAction" disabled><GoogleMark />Continue with Google</button>
            <button type="button" className="authDialogAction" disabled>Continue with Email</button>
          </div>
          <p className="authDialogFooter">
            Already have an account?{" "}
            <button type="button" className="authDialogLink" disabled>Log In</button>
          </p>
          <p className="authDialogAvailability" id={availabilityId}>Sign-up and login are coming soon.</p>
        </div>
      </dialog>
    </>
  );
}
