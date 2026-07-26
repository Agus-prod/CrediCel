-- Manual confirmation requested after the email provider returned only an
-- expired link. This is intentionally restricted to the reserved owner email.
do $$
declare v_user_id uuid;
begin
  select id into v_user_id from auth.users
  where lower(email)='augustocolindres1@gmail.com'
  order by created_at desc limit 1;
  if v_user_id is null then
    raise exception 'La cuenta maestra todavía no existe';
  end if;
  update auth.users
  set email_confirmed_at=coalesce(email_confirmed_at,now()),updated_at=now()
  where id=v_user_id;
  insert into public.platform_operators(user_id,display_name,status)
  values(v_user_id,'Augusto Colindres','active')
  on conflict(user_id) do update set display_name=excluded.display_name,status='active';
  delete from private.pending_platform_operators
  where email='augustocolindres1@gmail.com';
end $$;
