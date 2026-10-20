import { Check, Circle } from "lucide-react";
import { passwordRules } from "@/lib/passwordRules";

/** Live checklist shown under a "new password" field. */
export default function PasswordChecklist({ password }: { password: string }) {
  const rules = passwordRules(password);
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Password requirements">
      {rules.map((r) => (
        <li
          key={r.id}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            r.ok ? "text-emerald-700" : "text-gray-500"
          }`}
        >
          {r.ok ? (
            <Check size={13} strokeWidth={3} aria-hidden />
          ) : (
            <Circle size={13} aria-hidden />
          )}
          <span>{r.label}</span>
          <span className="sr-only">{r.ok ? "(met)" : "(not met yet)"}</span>
        </li>
      ))}
    </ul>
  );
}
