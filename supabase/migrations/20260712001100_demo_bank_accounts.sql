insert into public.bank_accounts(organization_id,business_unit_id,bank_name,account_name,masked_account_number,status)
select bu.organization_id,bu.id,'BAC Credomatic',bu.commercial_name,'**** 4821','active'
from public.business_units bu
where not exists(select 1 from public.bank_accounts ba where ba.organization_id=bu.organization_id and ba.status='active')
and bu.id=(select b2.id from public.business_units b2 where b2.organization_id=bu.organization_id order by b2.created_at limit 1);
