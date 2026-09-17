-- Vote mass report: YES / NO + detil voter
alter table mass_report_votes
  add column if not exists choice text not null default 'YES'
    check (choice in ('YES', 'NO'));
