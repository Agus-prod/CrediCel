begin;
select plan(3);

select has_function(
  'public',
  'submit_credit_application',
  array['uuid','uuid','text','text','text','text','text','numeric','numeric','integer'],
  'credit application submission exists'
);

select ok(
  position(
    'round(p_requested_price, 2) is distinct from round(v_inventory.cash_price, 2)'
    in pg_get_functiondef('public.submit_credit_application(uuid,uuid,text,text,text,text,text,numeric,numeric,integer)'::regprocedure)
  ) > 0,
  'browser price must match the locked inventory price'
);

select ok(
  position(
    'length(v_dni) <> 13'
    in pg_get_functiondef('public.submit_credit_application(uuid,uuid,text,text,text,text,text,numeric,numeric,integer)'::regprocedure)
  ) > 0,
  'DNI is normalized and requires thirteen digits'
);

select * from finish();
rollback;
