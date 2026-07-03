-- Applied to production 2026-07-02 (migration: roles_and_rpc_lockdown)
-- Source of truth copy. Adds admin role + locks down SECURITY DEFINER RPCs.

-- 1. Role column for admin gating
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

-- Grant admin manually per account, e.g.:
-- update public.profiles set role = 'admin' where email = '<admin-email>';

-- 2. Service-role-only OTP functions (explicit user id; callable only by service role)
create or replace function public.admin_send_contact_otp(p_user_id uuid, p_phone text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_otp text;
  v_recent_count int;
begin
  if p_user_id is null then
    raise exception 'User id required';
  end if;

  p_phone := regexp_replace(p_phone, '\s+', '', 'g');

  if length(p_phone) < 8 then
    raise exception 'Invalid phone number';
  end if;

  -- Rate limit: max 3 requests in last 10 minutes
  select count(*) into v_recent_count
  from phone_verification
  where user_id = p_user_id
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    raise exception 'Too many OTP requests, please try again later';
  end if;

  v_otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  update phone_verification
  set used = true
  where user_id = p_user_id
    and phone = p_phone
    and used = false;

  insert into phone_verification (user_id, phone, otp, expires_at)
  values (p_user_id, p_phone, v_otp, now() + interval '5 minutes');

  return v_otp;
end;
$$;

create or replace function public.admin_confirm_contact_otp(p_user_id uuid, p_phone text, p_otp text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row phone_verification%rowtype;
begin
  if p_user_id is null then
    raise exception 'User id required';
  end if;

  p_phone := regexp_replace(p_phone, '\s+', '', 'g');

  select * into v_row
  from phone_verification
  where user_id = p_user_id
    and phone = p_phone
    and otp = p_otp
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  update phone_verification set used = true where id = v_row.id;

  update profiles
  set contact_number = p_phone,
      phone_verified = true,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

revoke execute on function public.admin_send_contact_otp(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_confirm_contact_otp(uuid, text, text) from public, anon, authenticated;

-- 3. Lock down old / internal SECURITY DEFINER functions from API roles
--    (send_contact_otp used to RETURN the OTP to any authenticated caller — SMS bypass)
revoke execute on function public.send_contact_otp(text) from public, anon, authenticated;
revoke execute on function public.confirm_contact_otp(text, text) from public, anon, authenticated;
revoke execute on function public.send_phone_otp(text) from public, anon, authenticated;
revoke execute on function public.verify_phone_otp(text, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_perfume_score_from_listing() from public, anon, authenticated;

-- 4. Advisor fix: pin search_path on trigger function
alter function public.update_blog_updated_at() set search_path = 'public';
