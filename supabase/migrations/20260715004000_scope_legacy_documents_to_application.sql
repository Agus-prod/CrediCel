-- Scope legacy documents when the customer has exactly one credit application.
-- Ambiguous historical records remain customer-level instead of guessing.

with unique_application as (
  select
    organization_id,
    customer_id,
    min(id::text)::uuid as application_id
  from public.credit_applications
  group by organization_id, customer_id
  having count(*) = 1
)
update public.customer_documents as document
set application_id = unique_application.application_id
from unique_application
where document.application_id is null
  and document.organization_id = unique_application.organization_id
  and document.customer_id = unique_application.customer_id;
