-- Explicit platform ownership assignment requested by the product owner.
create table if not exists private.pending_platform_operators(
  email text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);
revoke all on private.pending_platform_operators from public,anon,authenticated;

insert into private.pending_platform_operators(email,display_name)
values('augustocolindres1@gmail.com','Augusto Colindres')
on conflict(email) do update set display_name=excluded.display_name;

create or replace function private.assign_pending_platform_operator()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
  select display_name into v_name from private.pending_platform_operators
  where email=lower(new.email);
  if found then
    insert into public.platform_operators(user_id,display_name,status)
    values(new.id,v_name,'active')
    on conflict(user_id) do update set display_name=excluded.display_name,status='active';
    delete from private.pending_platform_operators where email=lower(new.email);
  end if;
  return new;
end $$;

drop trigger if exists assign_pending_platform_operator on auth.users;
create trigger assign_pending_platform_operator
after insert or update of email on auth.users
for each row execute function private.assign_pending_platform_operator();

insert into public.platform_operators(user_id,display_name,status)
select user_row.id,pending.display_name,'active'
from auth.users user_row join private.pending_platform_operators pending
  on pending.email=lower(user_row.email)
on conflict(user_id) do update set display_name=excluded.display_name,status='active';

delete from private.pending_platform_operators pending
using auth.users user_row where pending.email=lower(user_row.email);
