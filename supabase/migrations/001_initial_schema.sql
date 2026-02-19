-- ReactAssess initial schema
-- All tables, indexes, RLS policies, and triggers

-- ─── updated_at trigger function ────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── organizations ──────────────────────────────────────────────────

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter'
    check (plan in ('starter', 'professional', 'enterprise')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at();

alter table organizations enable row level security;

create policy "Users can read own org"
  on organizations for select
  using (
    id in (
      select org_id from users where users.id = auth.uid()
    )
  );

-- ─── users ──────────────────────────────────────────────────────────

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'manager'
    check (role in ('admin', 'manager', 'recruiter')),
  created_at timestamptz default now()
);

alter table users enable row level security;

create policy "Users can read users in their org"
  on users for select
  using (
    org_id in (
      select org_id from users u where u.id = auth.uid()
    )
  );

-- ─── assessments ────────────────────────────────────────────────────

create table assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references users(id),
  title text not null,
  challenge_pool text[] not null default '{}',
  settings jsonb not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger assessments_updated_at
  before update on assessments
  for each row execute function update_updated_at();

alter table assessments enable row level security;

create policy "Users can read assessments in their org"
  on assessments for select
  using (
    org_id in (
      select org_id from users where users.id = auth.uid()
    )
  );

create policy "Users can insert assessments in their org"
  on assessments for insert
  with check (
    org_id in (
      select org_id from users where users.id = auth.uid()
    )
  );

create policy "Users can update assessments in their org"
  on assessments for update
  using (
    org_id in (
      select org_id from users where users.id = auth.uid()
    )
  );

create policy "Users can delete assessments in their org"
  on assessments for delete
  using (
    org_id in (
      select org_id from users where users.id = auth.uid()
    )
  );

-- ─── candidates ─────────────────────────────────────────────────────

create table candidates (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  email text not null,
  full_name text,
  token text unique not null,
  status text not null default 'invited'
    check (status in ('invited', 'in_progress', 'completed', 'expired')),
  invited_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table candidates enable row level security;

create policy "Users can read candidates in their org assessments"
  on candidates for select
  using (
    assessment_id in (
      select a.id from assessments a
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

create policy "Users can insert candidates in their org assessments"
  on candidates for insert
  with check (
    assessment_id in (
      select a.id from assessments a
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- ─── sessions ───────────────────────────────────────────────────────

create table sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  current_phase text not null default 'build'
    check (current_phase in ('build', 'explain', 'review', 'complete')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'
);

alter table sessions enable row level security;

create policy "Users can read sessions for their org candidates"
  on sessions for select
  using (
    candidate_id in (
      select c.id from candidates c
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- ─── events (immutable event log) ───────────────────────────────────

create table events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

create index idx_events_session_time on events (session_id, created_at);
create index idx_events_session_type on events (session_id, event_type);

alter table events enable row level security;

-- INSERT ONLY: no update or delete policies
create policy "Users can read events for their org sessions"
  on events for select
  using (
    session_id in (
      select s.id from sessions s
      join candidates c on c.id = s.candidate_id
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- Prevent updates and deletes on events (event sourcing — immutable)
create policy "Events are insert only - no updates"
  on events for update
  using (false);

create policy "Events are insert only - no deletes"
  on events for delete
  using (false);

-- ─── submissions ────────────────────────────────────────────────────

create table submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  phase text not null
    check (phase in ('build', 'explain', 'review')),
  code text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table submissions enable row level security;

create policy "Users can read submissions for their org sessions"
  on submissions for select
  using (
    session_id in (
      select s.id from sessions s
      join candidates c on c.id = s.candidate_id
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- ─── quickfire_responses ────────────────────────────────────────────

create table quickfire_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_index integer not null,
  question jsonb not null,
  response text,
  is_correct boolean,
  response_time_ms integer,
  created_at timestamptz default now()
);

alter table quickfire_responses enable row level security;

create policy "Users can read quickfire_responses for their org sessions"
  on quickfire_responses for select
  using (
    session_id in (
      select s.id from sessions s
      join candidates c on c.id = s.candidate_id
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- ─── review_comments ────────────────────────────────────────────────

create table review_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  file_path text not null,
  line_number integer not null,
  comment_text text not null,
  issue_category text,
  created_at timestamptz default now()
);

alter table review_comments enable row level security;

create policy "Users can read review_comments for their org sessions"
  on review_comments for select
  using (
    session_id in (
      select s.id from sessions s
      join candidates c on c.id = s.candidate_id
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );

-- ─── dossiers ───────────────────────────────────────────────────────

create table dossiers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid unique not null references candidates(id) on delete cascade,
  scores jsonb not null default '{}',
  profile jsonb not null default '{}',
  summary text,
  generated_at timestamptz default now()
);

alter table dossiers enable row level security;

create policy "Users can read dossiers for their org candidates"
  on dossiers for select
  using (
    candidate_id in (
      select c.id from candidates c
      join assessments a on a.id = c.assessment_id
      join users u on u.org_id = a.org_id
      where u.id = auth.uid()
    )
  );
