-- Assert-only checks for seller_tier_for. Raises on any mismatch.
do $$
declare
  r text;
  c record;
begin
  for c in
    select * from (values
      (19,  4.5,  22, null::text,   null::text),
      (20,  4.2,  22, null,         'silver'),
      (20,  4.19, 22, null,         null),
      (35,  4.4,  22, null,         'gold'),
      (50,  4.5,  22, null,         'platinum'),
      (50,  4.3,  22, null,         'silver'),
      (0,   null, 22, null,         null),
      (60,  4.5,  300, 'platinum',  'platinum'),
      (60,  4.3,  300, 'platinum',  'silver'),
      (60,  4.1,  300, 'platinum',  null),
      (60,  4.4,  300, 'platinum',  'gold'),
      (60,  4.5,  150, null,        'silver'),
      (100, 4.5,  201, null,        'silver'),
      (200, 4.5,  201, null,        'platinum'),
      (150, 4.4,  201, null,        'gold')
    ) as t(cnt, avg, members, fl, expected)
  loop
    r := public.seller_tier_for(c.cnt, c.avg, c.members, c.fl);
    if r is distinct from c.expected then
      raise exception 'seller_tier_for(%, %, %, %) = %, expected %',
        c.cnt, c.avg, c.members, c.fl, r, c.expected;
    end if;
  end loop;
end $$;
