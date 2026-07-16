-- Match transfer references by bank as well as reference and serialize the
-- duplicate check so concurrent reports cannot bypass the warning heuristic.
drop index if exists public.transfer_reports_potential_duplicate;

create index transfer_reports_potential_duplicate
  on public.transfer_reports (
    organization_id,
    lower(origin_bank),
    lower(reference_number),
    amount,
    transferred_on
  )
  where status not in ('rejected', 'reversed');

create or replace function private.flag_duplicate_transfer_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      new.organization_id::text || '|' || lower(trim(new.origin_bank)) || '|' || lower(trim(new.reference_number)) || '|' || new.amount::text,
      0
    )
  );

  if exists (
    select 1
    from public.transfer_reports as report
    where report.organization_id = new.organization_id
      and lower(trim(report.origin_bank)) = lower(trim(new.origin_bank))
      and lower(trim(report.reference_number)) = lower(trim(new.reference_number))
      and report.amount = new.amount
      and report.transferred_on between new.transferred_on - 7 and new.transferred_on + 7
      and report.status not in ('rejected', 'reversed')
  ) then
    new.status := 'duplicate_suspected';
  end if;

  return new;
end;
$$;

revoke all on function private.flag_duplicate_transfer_reference() from public, anon, authenticated;
