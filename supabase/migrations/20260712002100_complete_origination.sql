create table public.credit_application_profiles(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,application_id uuid not null unique references credit_applications on delete cascade,
 birth_date date not null,marital_status text not null,dependents integer not null default 0,current_address text not null,housing_type text not null,
 employer_name text not null,job_title text,monthly_income numeric(14,2)not null,monthly_expenses numeric(14,2)not null,employment_months integer not null,
 reference_one_name text not null,reference_one_phone text not null,reference_one_relationship text not null,
 reference_two_name text not null,reference_two_phone text not null,reference_two_relationship text not null,
 consent_data_processing boolean not null,consent_credit_review boolean not null,created_at timestamptz not null default now()
);
alter table public.credit_application_profiles enable row level security;alter table public.credit_application_profiles force row level security;
create policy application_profiles_read on public.credit_application_profiles for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.credit_applications a where a.id=application_id and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('credit_manager')or private.has_branch_access(a.branch_id))));
grant select on public.credit_application_profiles to authenticated;

create or replace function public.submit_complete_credit_application(
 p_branch_id uuid,p_inventory_unit_id uuid,p_dni text,p_first_name text,p_last_name text,p_phone text,p_email text,p_requested_price numeric,p_down_payment numeric,p_term integer,
 p_birth_date date,p_marital_status text,p_dependents integer,p_current_address text,p_housing_type text,p_employer_name text,p_job_title text,p_monthly_income numeric,p_monthly_expenses numeric,p_employment_months integer,
 p_reference_one_name text,p_reference_one_phone text,p_reference_one_relationship text,p_reference_two_name text,p_reference_two_phone text,p_reference_two_relationship text,p_consent_data_processing boolean,p_consent_credit_review boolean
)returns uuid language plpgsql security definer set search_path='' as $$
declare v_app uuid;v_customer uuid;begin
 if p_birth_date>current_date-interval'18 years'or p_monthly_income<=0 or p_monthly_expenses<0 or p_monthly_expenses>=p_monthly_income or p_employment_months<0 or not p_consent_data_processing or not p_consent_credit_review then raise exception'Datos financieros, edad o consentimientos inválidos';end if;
 if nullif(trim(p_current_address),'')is null or nullif(trim(p_employer_name),'')is null or nullif(trim(p_reference_one_name),'')is null or nullif(trim(p_reference_two_name),'')is null then raise exception'Complete domicilio, empleo y referencias';end if;
 v_app=public.submit_credit_application(p_branch_id,p_inventory_unit_id,p_dni,p_first_name,p_last_name,p_phone,p_email,p_requested_price,p_down_payment,p_term);
 select customer_id into v_customer from public.credit_applications where id=v_app;
 insert into public.credit_application_profiles(organization_id,application_id,birth_date,marital_status,dependents,current_address,housing_type,employer_name,job_title,monthly_income,monthly_expenses,employment_months,reference_one_name,reference_one_phone,reference_one_relationship,reference_two_name,reference_two_phone,reference_two_relationship,consent_data_processing,consent_credit_review)
 values(private.current_organization_id(),v_app,p_birth_date,p_marital_status,greatest(0,p_dependents),trim(p_current_address),p_housing_type,trim(p_employer_name),nullif(trim(p_job_title),''),p_monthly_income,p_monthly_expenses,p_employment_months,trim(p_reference_one_name),trim(p_reference_one_phone),trim(p_reference_one_relationship),trim(p_reference_two_name),trim(p_reference_two_phone),trim(p_reference_two_relationship),p_consent_data_processing,p_consent_credit_review);
 insert into public.customer_addresses(organization_id,customer_id,address_type,address)values(private.current_organization_id(),v_customer,'home',trim(p_current_address));
 insert into public.customer_employment(organization_id,customer_id,employer_name,position,monthly_income,started_on)values(private.current_organization_id(),v_customer,trim(p_employer_name),nullif(trim(p_job_title),''),p_monthly_income,current_date-(p_employment_months||' months')::interval);
 insert into public.customer_references(organization_id,customer_id,name,relationship,phone)values(private.current_organization_id(),v_customer,trim(p_reference_one_name),trim(p_reference_one_relationship),trim(p_reference_one_phone)),(private.current_organization_id(),v_customer,trim(p_reference_two_name),trim(p_reference_two_relationship),trim(p_reference_two_phone));
 insert into public.customer_consents(organization_id,customer_id,consent_type,version,granted)values(private.current_organization_id(),v_customer,'data_processing','1.0',true),(private.current_organization_id(),v_customer,'credit_review','1.0',true);
 return v_app;
end$$;
revoke all on function public.submit_complete_credit_application(uuid,uuid,text,text,text,text,text,numeric,numeric,integer,date,text,integer,text,text,text,text,numeric,numeric,integer,text,text,text,text,text,text,boolean,boolean)from public,anon;
grant execute on function public.submit_complete_credit_application(uuid,uuid,text,text,text,text,text,numeric,numeric,integer,date,text,integer,text,text,text,text,numeric,numeric,integer,text,text,text,text,text,text,boolean,boolean)to authenticated;
