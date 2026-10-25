-- OTP hardening: cryptographically random codes + max 5 wrong guesses per code.
alter table public.phone_verification add column if not exists attempts int not null default 0;

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

  select count(*) into v_recent_count
  from phone_verification
  where user_id = p_user_id
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    raise exception 'Too many OTP requests, please try again later';
  end if;

  v_otp := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');

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
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found or v_row.attempts >= 5 then
    return false;
  end if;

  if v_row.otp <> p_otp then
    update phone_verification set attempts = attempts + 1 where id = v_row.id;
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
