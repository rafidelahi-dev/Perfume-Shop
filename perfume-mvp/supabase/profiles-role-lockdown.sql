-- Role-escalation fix (2026-10-05)
-- Problem: RLS "profiles_update_own" + column grants let any signed-in user
-- UPDATE their own profiles.role / phone_verified straight from the browser.
-- Fix: a trigger rejects those changes unless the caller is NOT a
-- PostgREST client role (service role, SECURITY DEFINER RPCs, and the SQL
-- editor / postgres all keep working). current_user is used instead of JWT
-- claims because it can't be spoofed by the client.

create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_phone text;
begin
  -- Only restrict direct client access (anon / authenticated roles).
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' then
      raise exception 'role can only be set by an administrator' using errcode = '42501';
    end if;
    if coalesce(new.phone_verified, false) then
      raise exception 'phone_verified can only be set by the server' using errcode = '42501';
    end if;
  else
    if new.role is distinct from old.role then
      raise exception 'role can only be changed by an administrator' using errcode = '42501';
    end if;
    if new.phone_verified is distinct from old.phone_verified then
      raise exception 'phone_verified can only be changed by the server' using errcode = '42501';
    end if;
  end if;

  -- An admin's contact number can't be put on any other profile.
  if new.contact_number is not null
     and (tg_op = 'INSERT' or new.contact_number is distinct from old.contact_number) then
    v_phone := regexp_replace(new.contact_number, '\s+', '', 'g');
    if exists (
      select 1 from public.profiles a
      where a.role = 'admin'
        and a.id <> new.id
        and regexp_replace(coalesce(a.contact_number, ''), '\s+', '', 'g') = v_phone
    ) then
      raise exception 'this contact number is already in use' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();
